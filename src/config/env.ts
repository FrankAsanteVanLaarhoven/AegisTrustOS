import { z } from "zod";

/**
 * Zod-validated environment.
 * Production missing AUTH_SECRET no longer hard-crashes the whole app —
 * we fall back and report insecureMode so /health and public pages stay up.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  IDV_VENDOR: z.enum(["MOCK", "TRULIOO", "SOCURE"]).default("MOCK"),
  IDV_WEBHOOK_SECRET: z.string().optional(),
  TRULIOO_API_KEY: z.string().optional(),
  TRULIOO_BASE_URL: z.string().optional(),
  SOCURE_API_KEY: z.string().optional(),
  SOCURE_BASE_URL: z.string().optional(),
  JURISDICTION_DEFAULT: z.string().default("UK"),
  SESSION_MAX_AGE_HOURS: z.coerce.number().min(1).max(168).default(8),
  AUDIT_RETENTION_DAYS: z.coerce.number().min(30).default(2555),
  RATE_LIMIT_BACKEND: z.enum(["memory", "redis"]).default("memory"),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  APP_VERSION: z.string().optional(),
  FEATURE_FLAGS: z.string().optional(),
  DOCUMENT_ENCRYPTION_KEY: z.string().optional(),
  STORAGE_BACKEND: z.enum(["local_encrypted", "s3"]).default("local_encrypted"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  NOTIFY_BACKEND: z.enum(["file", "ses", "postmark", "webhook"]).default("file"),
  NOTIFY_WEBHOOK_URL: z.string().optional(),
  NOTIFY_FROM_EMAIL: z.string().optional(),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  SES_REGION: z.string().optional(),
  PAYMENTS_BACKEND: z.enum(["stub", "stripe"]).default("stub"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PLATFORM_FEE_BPS: z.coerce.number().min(0).max(5000).default(1500),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  DOMAIN_EVENT_WEBHOOK_URL: z.string().optional(),
  PILOT_NOTIFY_EMAIL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema> & {
  isProd: boolean;
  authSecret: string;
  /** True when running without a strong production AUTH_SECRET */
  insecureMode: boolean;
  envWarnings: string[];
};

const DEV_FALLBACK_SECRET =
  "aegis-dev-secret-change-in-production-32chars";

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    // Last-resort defaults so health endpoints still answer
    console.error("[aegis] Invalid environment, using emergency defaults:", msg);
    cached = emergencyEnv([`parse: ${msg}`]);
    return cached;
  }

  const data = parsed.data;
  const isProd = data.NODE_ENV === "production";
  const warnings: string[] = [];

  let authSecret = data.AUTH_SECRET ?? "";
  let insecureMode = false;

  if (!authSecret || authSecret.length < 32) {
    if (isProd) {
      warnings.push(
        "AUTH_SECRET missing or <32 chars — set a strong secret in Vercel Production env",
      );
      console.error(
        "[aegis] AUTH_SECRET must be ≥32 characters in production. Using temporary fallback so the site can boot. SET AUTH_SECRET IN VERCEL.",
      );
      insecureMode = true;
      authSecret =
        authSecret.length >= 16 ? authSecret.padEnd(32, "0") : DEV_FALLBACK_SECRET;
    } else {
      authSecret = authSecret || DEV_FALLBACK_SECRET;
    }
  }

  if (isProd) {
    if (data.IDV_VENDOR !== "MOCK" && !data.IDV_WEBHOOK_SECRET) {
      warnings.push("IDV_WEBHOOK_SECRET missing while IDV_VENDOR is live");
      // Force mock behavior warning only — do not crash
      console.warn(
        "[aegis] IDV_WEBHOOK_SECRET required for non-MOCK IDV — configure before go-live",
      );
    }
    if (data.PAYMENTS_BACKEND === "stripe") {
      if (!data.STRIPE_WEBHOOK_SECRET || !data.STRIPE_SECRET_KEY) {
        warnings.push("Stripe keys incomplete — payments will fail");
        console.warn("[aegis] Stripe env incomplete");
      }
    }
    const db = data.DATABASE_URL ?? "";
    if (!db.startsWith("postgres")) {
      warnings.push(
        "DATABASE_URL is not Postgres — Vercel cannot use local SQLite reliably",
      );
      console.error(
        "[aegis] Set DATABASE_URL to a Postgres connection string (e.g. Neon).",
      );
    }
  }

  cached = {
    ...data,
    isProd,
    authSecret,
    insecureMode,
    envWarnings: warnings,
  };
  return cached;
}

function emergencyEnv(warnings: string[]): AppEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
    AUTH_SECRET: DEV_FALLBACK_SECRET,
    IDV_VENDOR: "MOCK",
    JURISDICTION_DEFAULT: "UK",
    SESSION_MAX_AGE_HOURS: 8,
    AUDIT_RETENTION_DAYS: 2555,
    RATE_LIMIT_BACKEND: "memory",
    LOG_LEVEL: "error",
    STORAGE_BACKEND: "local_encrypted",
    NOTIFY_BACKEND: "file",
    PAYMENTS_BACKEND: "stub",
    PLATFORM_FEE_BPS: 1500,
    isProd: true,
    authSecret: DEV_FALLBACK_SECRET,
    insecureMode: true,
    envWarnings: warnings,
  };
}

export function resetEnvCache() {
  cached = null;
}
