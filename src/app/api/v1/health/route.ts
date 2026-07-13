import { db } from "@/lib/db";
import { getEnv } from "@/config/env";
import { getFeatures } from "@/config/features";
import { apiOk, apiErr } from "@/lib/api/envelope";
import { log } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnv();
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    log.error("health_db_fail", {
      error: e instanceof Error ? e.message : "unknown",
    });
  }

  const body = {
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    version: env.APP_VERSION ?? process.env.npm_package_version ?? "0.1.0",
    jurisdictionDefault: env.JURISDICTION_DEFAULT,
    idvVendor: env.IDV_VENDOR,
    storage: env.STORAGE_BACKEND,
    notify: env.NOTIFY_BACKEND,
    payments: env.PAYMENTS_BACKEND,
    platformFeeBps: env.PLATFORM_FEE_BPS,
    readiness: {
      idvWebhookSecret: Boolean(env.IDV_WEBHOOK_SECRET) || env.IDV_VENDOR === "MOCK",
      stripeWebhookSecret:
        env.PAYMENTS_BACKEND !== "stripe" || Boolean(env.STRIPE_WEBHOOK_SECRET),
      authSecret: Boolean(env.AUTH_SECRET && env.AUTH_SECRET.length >= 16),
    },
    features: getFeatures(),
    timestamp: new Date().toISOString(),
  };

  if (!dbOk) {
    return apiErr("SERVER", "Database unavailable", 503);
  }
  return apiOk(body);
}
