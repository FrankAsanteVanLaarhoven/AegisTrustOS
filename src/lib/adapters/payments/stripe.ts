import type {
  ConnectAccountLink,
  PaymentIntent,
  PaymentIntentInput,
  PaymentsPort,
} from "@/lib/ports/payments";
import { db } from "@/lib/db";
import { getEnv } from "@/config/env";
import { log } from "@/lib/observability/logger";
import { nanoid } from "nanoid";

/**
 * Stripe PaymentIntents + Connect destination charges.
 * Requires STRIPE_SECRET_KEY. Falls back is handled by container (stub).
 */
export class StripePayments implements PaymentsPort {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret ?? getEnv().STRIPE_SECRET_KEY ?? "";
    if (!this.secret) throw new Error("STRIPE_SECRET_KEY required");
  }

  private async stripeRequest(
    path: string,
    params: Record<string, string>,
    method: "POST" | "GET" = "POST",
  ): Promise<Record<string, unknown>> {
    const body =
      method === "POST" ? new URLSearchParams(params).toString() : undefined;
    const url =
      method === "GET" && Object.keys(params).length
        ? `https://api.stripe.com/v1${path}?${new URLSearchParams(params)}`
        : `https://api.stripe.com/v1${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.secret}`,
        ...(method === "POST"
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}),
      },
      body,
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        typeof json.error === "object" && json.error && "message" in json.error
          ? String((json.error as { message: string }).message)
          : "Stripe error",
      );
    }
    return json;
  }

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    const currency = (input.currency ?? "gbp").toLowerCase();
    const feeBps =
      input.platformFeeBps ?? getEnv().PLATFORM_FEE_BPS ?? 1500;
    const applicationFeePence = Math.round(
      (input.amountPence * feeBps) / 10_000,
    );

    let transferDestination = input.transferDestination ?? null;
    if (!transferDestination && input.providerId) {
      const provider = await db.providerProfile.findUnique({
        where: { id: input.providerId },
        select: { stripeConnectAccountId: true },
      });
      transferDestination = provider?.stripeConnectAccountId ?? null;
    }

    const params: Record<string, string> = {
      amount: String(input.amountPence),
      currency,
      "automatic_payment_methods[enabled]": "true",
      description: input.description ?? "Aegis booking",
      "metadata[bookingId]": input.bookingId ?? "",
      "metadata[clientId]": input.clientId,
      "metadata[providerId]": input.providerId ?? "",
      "metadata[applicationFeePence]": String(applicationFeePence),
    };

    // Marketplace destination charge: platform fee + transfer to provider
    if (transferDestination) {
      params["application_fee_amount"] = String(applicationFeePence);
      params["transfer_data[destination]"] = transferDestination;
    }

    const stripePi = await this.stripeRequest("/payment_intents", params);

    const id = String(stripePi.id ?? `pi_${nanoid(12)}`);
    const clientSecret = String(stripePi.client_secret ?? "");

    await db.paymentIntent.create({
      data: {
        id,
        amountPence: input.amountPence,
        currency,
        status: "REQUIRES_PAYMENT",
        clientId: input.clientId,
        providerId: input.providerId ?? null,
        bookingId: input.bookingId ?? null,
        description: input.description ?? null,
        clientSecret,
        providerRef: "stripe",
        applicationFeePence,
        transferDestination,
      },
    });

    log.info("stripe_intent_created", {
      id,
      amountPence: input.amountPence,
      applicationFeePence,
      transferDestination,
    });

    return {
      id,
      status: "requires_payment",
      amountPence: input.amountPence,
      currency,
      clientSecret,
      providerRef: "stripe",
      applicationFeePence,
      transferDestination: transferDestination ?? undefined,
    };
  }

  async capture(intentId: string): Promise<PaymentIntent> {
    try {
      await this.stripeRequest(`/payment_intents/${intentId}/capture`, {});
    } catch {
      /* may already be succeeded */
    }
    const row = await db.paymentIntent.update({
      where: { id: intentId },
      data: { status: "SUCCEEDED" },
    });
    return map(row);
  }

  async refund(intentId: string, amountPence?: number): Promise<PaymentIntent> {
    const params: Record<string, string> = {
      payment_intent: intentId,
    };
    if (amountPence) params.amount = String(amountPence);
    await this.stripeRequest("/refunds", params);
    const row = await db.paymentIntent.update({
      where: { id: intentId },
      data: { status: "CANCELLED" },
    });
    return map(row);
  }

  async ensureConnectAccount(input: {
    providerId: string;
    email: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<ConnectAccountLink> {
    const profile = await db.providerProfile.findUnique({
      where: { id: input.providerId },
    });
    if (!profile) throw new Error("Provider not found");

    let accountId = profile.stripeConnectAccountId;
    if (!accountId) {
      const acct = await this.stripeRequest("/accounts", {
        type: "express",
        country: "GB",
        email: input.email,
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        "business_profile[product_description]": "Aegis verified services",
        "metadata[providerId]": input.providerId,
      });
      accountId = String(acct.id);
      await db.providerProfile.update({
        where: { id: input.providerId },
        data: {
          stripeConnectAccountId: accountId,
          stripeConnectStatus: "pending",
        },
      });
    }

    const link = await this.stripeRequest("/account_links", {
      account: accountId,
      refresh_url: input.refreshUrl,
      return_url: input.returnUrl,
      type: "account_onboarding",
    });

    return {
      accountId,
      url: String(link.url ?? input.returnUrl),
      status: "pending",
    };
  }
}

function map(row: {
  id: string;
  status: string;
  amountPence: number;
  currency: string;
  clientSecret: string | null;
  providerRef: string | null;
  applicationFeePence?: number | null;
  transferDestination?: string | null;
}): PaymentIntent {
  const statusMap: Record<string, PaymentIntent["status"]> = {
    REQUIRES_PAYMENT: "requires_payment",
    PROCESSING: "processing",
    SUCCEEDED: "succeeded",
    CANCELLED: "cancelled",
  };
  return {
    id: row.id,
    status: statusMap[row.status] ?? "requires_payment",
    amountPence: row.amountPence,
    currency: row.currency,
    clientSecret: row.clientSecret ?? undefined,
    providerRef: row.providerRef ?? undefined,
    applicationFeePence: row.applicationFeePence ?? undefined,
    transferDestination: row.transferDestination ?? undefined,
  };
}
