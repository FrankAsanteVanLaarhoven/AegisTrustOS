import { NextResponse } from "next/server";
import { log } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Never throws — always returns JSON so Vercel diagnostics work.
 */
export async function GET() {
  let dbOk = false;
  let envOk = false;
  let env: {
    APP_VERSION?: string;
    JURISDICTION_DEFAULT?: string;
    IDV_VENDOR?: string;
    STORAGE_BACKEND?: string;
    NOTIFY_BACKEND?: string;
    PAYMENTS_BACKEND?: string;
    PLATFORM_FEE_BPS?: number;
    DATABASE_URL?: string;
    insecureMode?: boolean;
    envWarnings?: string[];
    AUTH_SECRET?: string;
  } = {};
  let features: Record<string, boolean> = {};
  let error: string | undefined;

  try {
    const { getEnv } = await import("@/config/env");
    const e = getEnv();
    env = e;
    envOk = true;
  } catch (e) {
    error = e instanceof Error ? e.message : "env_failed";
    log.error("health_env_fail", { error });
  }

  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    log.error("health_db_fail", {
      error: e instanceof Error ? e.message : "unknown",
    });
    if (!error) error = e instanceof Error ? e.message : "db_failed";
  }

  try {
    const { getFeatures } = await import("@/config/features");
    features = getFeatures() as unknown as Record<string, boolean>;
  } catch {
    /* ignore */
  }

  const status = dbOk && envOk && !env.insecureMode ? "ok" : "degraded";
  const body = {
    ok: true as const,
    data: {
      status,
      db: dbOk,
      env: envOk,
      insecureMode: Boolean(env.insecureMode),
      warnings: env.envWarnings ?? [],
      error,
      version: env.APP_VERSION ?? process.env.npm_package_version ?? "0.1.0",
      jurisdictionDefault: env.JURISDICTION_DEFAULT ?? "UK",
      idvVendor: env.IDV_VENDOR ?? "MOCK",
      storage: env.STORAGE_BACKEND ?? "local_encrypted",
      notify: env.NOTIFY_BACKEND ?? "file",
      payments: env.PAYMENTS_BACKEND ?? "stub",
      platformFeeBps: env.PLATFORM_FEE_BPS ?? 1500,
      databaseKind: (env.DATABASE_URL ?? "").startsWith("postgres")
        ? "postgresql"
        : "sqlite_or_other",
      authSecretConfigured: Boolean(
        process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32,
      ),
      features,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
