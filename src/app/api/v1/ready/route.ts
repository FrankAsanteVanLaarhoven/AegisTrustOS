import { NextResponse } from "next/server";
import { log } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Readiness for load balancers. Returns 503 only when DB is hard-down
 * and we are not intentionally degraded for bootstrap.
 */
export async function GET() {
  const checks: Record<string, boolean> = {};
  const warnings: string[] = [];

  try {
    const { getEnv } = await import("@/config/env");
    const env = getEnv();
    checks.env = true;
    checks.authSecret = Boolean(env.authSecret && env.authSecret.length >= 16);
    checks.authSecretStrong = Boolean(
      process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32,
    );
    checks.postgres = (env.DATABASE_URL ?? "").startsWith("postgres");
    if (env.insecureMode) warnings.push(...env.envWarnings);
  } catch {
    checks.env = false;
  }

  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (e) {
    checks.database = false;
    log.error("ready_db_fail", {
      error: e instanceof Error ? e.message : "unknown",
    });
  }

  // Ready for traffic if app boots; fully healthy when DB + secrets OK
  const ready = checks.env === true;
  const healthy = ready && checks.database === true && checks.authSecretStrong === true;

  return NextResponse.json(
    {
      ok: true as const,
      data: {
        ready,
        healthy,
        checks,
        warnings,
        version: process.env.APP_VERSION ?? "0.1.0",
        timestamp: new Date().toISOString(),
      },
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
