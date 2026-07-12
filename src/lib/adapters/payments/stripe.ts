import type { PaymentIntent, PaymentIntentInput, PaymentsPort } from "@/lib/ports/payments";
import { db } from "@/lib/db";
import { getEnv } from "@/config/env";
import { log } from "@/lib/observability/logger";
import { nanoid } from "nanoid";

/**
 * Stripe PaymentIntents adapter.
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
  ): Promise<Record<string, unknown>> {
    const body = new URLSearchParams(params);
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
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
    const stripePi = await this.stripeRequest("/payment_intents", {
      amount: String(input.amountPence),
      currency,
      "automatic_payment_methods[enabled]": "true",
      description: input.description ?? "Aegis booking",
      "metadata[bookingId]": input.bookingId ?? "",
      "metadata[clientId]": input.clientId,
      "metadata[providerId]": input.providerId ?? "",
    });

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
      },
    });

    log.info("stripe_intent_created", { id, amountPence: input.amountPence });

    return {
      id,
      status: "requires_payment",
      amountPence: input.amountPence,
      currency,
      clientSecret,
      providerRef: "stripe",
    };
  }

  async capture(intentId: string): Promise<PaymentIntent> {
    // For automatic methods, confirm is client-side; mark succeeded when webhook arrives.
    // Manual capture path:
    try {
      await this.stripeRequest(`/payment_intents/${intentId}/capture`, {});
    } catch {
      /* may already be succeeded */
    }
    const row = await db.paymentIntent.update({
      where: { id: intentId },
      data: { status: "SUCCEEDED" },
    });
    return {
      id: row.id,
      status: "succeeded",
      amountPence: row.amountPence,
      currency: row.currency,
      clientSecret: row.clientSecret ?? undefined,
      providerRef: "stripe",
    };
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
    return {
      id: row.id,
      status: "cancelled",
      amountPence: row.amountPence,
      currency: row.currency,
      providerRef: "stripe",
    };
  }
}
