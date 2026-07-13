import { nanoid } from "nanoid";
import type {
  ConnectAccountLink,
  PaymentIntent,
  PaymentIntentInput,
  PaymentsPort,
} from "@/lib/ports/payments";
import { db } from "@/lib/db";
import { getEnv } from "@/config/env";
import { log } from "@/lib/observability/logger";

/**
 * Payments stub — persists intents for demo with Connect-shaped fee split.
 * Production: StripePayments implements the same port with real Connect.
 */
export class StubPayments implements PaymentsPort {
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    const id = `pi_${nanoid(16)}`;
    const currency = input.currency ?? "gbp";
    const clientSecret = `${id}_secret_${nanoid(8)}`;
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
        providerRef: "stub",
        applicationFeePence,
        transferDestination,
      },
    });

    log.info("payment_intent_created", {
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
      providerRef: "stub",
      applicationFeePence,
      transferDestination: transferDestination ?? undefined,
    };
  }

  async capture(intentId: string): Promise<PaymentIntent> {
    const row = await db.paymentIntent.update({
      where: { id: intentId },
      data: { status: "SUCCEEDED" },
    });
    return map(row);
  }

  async refund(intentId: string, amountPence?: number): Promise<PaymentIntent> {
    const row = await db.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: "CANCELLED",
        description: amountPence
          ? `Refund ${amountPence}p`
          : "Full refund (stub)",
      },
    });
    return map(row);
  }

  async ensureConnectAccount(input: {
    providerId: string;
    email: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<ConnectAccountLink> {
    const accountId = `acct_stub_${nanoid(10)}`;
    await db.providerProfile.update({
      where: { id: input.providerId },
      data: {
        stripeConnectAccountId: accountId,
        stripeConnectStatus: "pending",
      },
    });
    log.info("connect_account_stub", {
      providerId: input.providerId,
      accountId,
    });
    return {
      accountId,
      url: `${input.returnUrl}?connect=stub&account=${accountId}`,
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
