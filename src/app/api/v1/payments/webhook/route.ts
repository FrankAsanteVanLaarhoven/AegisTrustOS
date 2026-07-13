import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { getEnv } from "@/config/env";
import { apiOk, apiErr } from "@/lib/api/envelope";
import { writeAudit } from "@/lib/audit";
import { log } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Stripe (or stub) payment webhook.
 * With STRIPE_WEBHOOK_SECRET: verifies Stripe-Signature (t=…,v1=…).
 * Without secret (dev): accepts JSON { type, data: { object: { id, status } } }.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const env = getEnv();

  if (env.STRIPE_WEBHOOK_SECRET) {
    const sig = req.headers.get("stripe-signature") ?? "";
    if (!verifyStripeSignature(rawBody, sig, env.STRIPE_WEBHOOK_SECRET)) {
      return apiErr("UNAUTHORIZED", "Invalid Stripe signature");
    }
  }

  let event: {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return apiErr("VALIDATION", "Invalid JSON");
  }

  const type = event.type ?? "";
  const obj = event.data?.object ?? {};
  const intentId = String(obj.id ?? "");

  if (!intentId) {
    return apiErr("VALIDATION", "Missing payment intent id");
  }

  if (
    type === "payment_intent.succeeded" ||
    String(obj.status) === "succeeded"
  ) {
    const existing = await db.paymentIntent.findUnique({
      where: { id: intentId },
    });
    if (existing) {
      await db.paymentIntent.update({
        where: { id: intentId },
        data: { status: "SUCCEEDED" },
      });
      await writeAudit({
        entityType: "PaymentIntent",
        entityId: intentId,
        action: "PAYMENT_WEBHOOK_SUCCEEDED",
        payload: {
          applicationFeePence: existing.applicationFeePence,
          transferDestination: existing.transferDestination,
        },
        eventType: "payment.succeeded",
      });
    }
    log.info("payment_webhook_succeeded", { intentId });
    return apiOk({ intentId, status: "SUCCEEDED" });
  }

  if (
    type === "payment_intent.payment_failed" ||
    type === "payment_intent.canceled" ||
    String(obj.status) === "canceled"
  ) {
    const existing = await db.paymentIntent.findUnique({
      where: { id: intentId },
    });
    if (existing) {
      await db.paymentIntent.update({
        where: { id: intentId },
        data: { status: "CANCELLED" },
      });
      await writeAudit({
        entityType: "PaymentIntent",
        entityId: intentId,
        action: "PAYMENT_WEBHOOK_CANCELLED",
        payload: { type },
        eventType: "payment.cancelled",
      });
    }
    return apiOk({ intentId, status: "CANCELLED" });
  }

  // Connect account updates
  if (type === "account.updated") {
    const acct = String(obj.id ?? "");
    const chargesEnabled = Boolean(obj.charges_enabled);
    if (acct) {
      await db.providerProfile.updateMany({
        where: { stripeConnectAccountId: acct },
        data: {
          stripeConnectStatus: chargesEnabled ? "active" : "restricted",
        },
      });
    }
    return apiOk({ account: acct, status: chargesEnabled ? "active" : "restricted" });
  }

  log.info("payment_webhook_ignored", { type });
  return apiOk({ ignored: true, type });
}

function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): boolean {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const [k, v] = p.split("=");
        return [k.trim(), v?.trim() ?? ""];
      }),
    );
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;
    const expected = createHmac("sha256", secret)
      .update(`${t}.${payload}`)
      .digest("hex");
    const a = Buffer.from(v1);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
