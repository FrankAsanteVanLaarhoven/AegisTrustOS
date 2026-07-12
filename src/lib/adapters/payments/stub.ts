import { nanoid } from "nanoid";
import type { PaymentIntent, PaymentIntentInput, PaymentsPort } from "@/lib/ports/payments";
import { db } from "@/lib/db";
import { log } from "@/lib/observability/logger";

/**
 * Payments stub — persists intents for demo.
 * Production: Stripe Connect adapter implementing PaymentsPort.
 */
export class StubPayments implements PaymentsPort {
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    const id = `pi_${nanoid(16)}`;
    const currency = input.currency ?? "gbp";
    const clientSecret = `${id}_secret_${nanoid(8)}`;

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
      },
    });

    log.info("payment_intent_created", { id, amountPence: input.amountPence });

    return {
      id,
      status: "requires_payment",
      amountPence: input.amountPence,
      currency,
      clientSecret,
      providerRef: "stub",
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
}

function map(row: {
  id: string;
  status: string;
  amountPence: number;
  currency: string;
  clientSecret: string | null;
  providerRef: string | null;
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
  };
}
