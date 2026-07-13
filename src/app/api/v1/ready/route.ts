import { db } from "@/lib/db";
import { getEnv } from "@/config/env";
import { apiOk, apiErr } from "@/lib/api/envelope";
import { log } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Readiness probe for load balancers / K8s / ECS.
 * Fails (503) when DB is down or production-critical env is incomplete.
 */
export async function GET() {
  const env = getEnv();
  const checks: Record<string, boolean> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (e) {
    checks.database = false;
    log.error("ready_db_fail", {
      error: e instanceof Error ? e.message : "unknown",
    });
  }

  checks.authSecret = Boolean(env.authSecret && env.authSecret.length >= 16);

  if (env.isProd) {
    checks.authSecretStrong = Boolean(
      env.AUTH_SECRET && env.AUTH_SECRET.length >= 32,
    );
    checks.idvWebhook =
      env.IDV_VENDOR === "MOCK" || Boolean(env.IDV_WEBHOOK_SECRET);
    checks.paymentsWebhook =
      env.PAYMENTS_BACKEND !== "stripe" || Boolean(env.STRIPE_WEBHOOK_SECRET);
  } else {
    checks.authSecretStrong = true;
    checks.idvWebhook = true;
    checks.paymentsWebhook = true;
  }

  const ready = Object.values(checks).every(Boolean);

  const body = {
    ready,
    checks,
    version: env.APP_VERSION ?? process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
  };

  if (!ready) {
    return apiErr("SERVER", "Not ready", 503);
  }
  return apiOk(body);
}
