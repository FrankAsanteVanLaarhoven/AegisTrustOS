import { z } from "zod";

/**
 * Zod-validated environment. Fails fast in production if critical secrets missing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  AUTH_SECRET: z.string().min(16).optional(),
  NEXTAUTH_URL: z.string().optional(),
  IDV_VENDOR: z.enum(["MOCK", "TRULIOO", "SOCURE"]).default("MOCK"),
  /** Shared secret / HMAC key for /api/v1/idv/webhook */
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
  /** AES key material for encrypted document store (defaults to AUTH_SECRET) */
  DOCUMENT_ENCRYPTION_KEY: z.string().optional(),
  STORAGE_BACKEND: z.enum(["local_encrypted", "s3"]).default("local_encrypted"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  NOTIFY_BACKEND: z.enum(["file", "ses", "postmark", "webhook"]).default("file"),
  NOTIFY_WEBHOOK_URL: z.string().optional(),
  PAYMENTS_BACKEND: z.enum(["stub", "stripe"]).default("stub"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  /** Marketplace platform fee in basis points (1500 = 15%) */
  PLATFORM_FEE_BPS: z.coerce.number().min(0).max(5000).default(1500),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  DOMAIN_EVENT_WEBHOOK_URL: z.string().optional(),
  /** Postgres helper: set when using docker-compose */
  // DATABASE_URL=postgresql://aegis:aegis@localhost:5433/aegis
});

export type AppEnv = z.infer<typeof envSchema> & {
  isProd: boolean;
  authSecret: string;
};

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }

  const data = parsed.data;
  const isProd = data.NODE_ENV === "production";

  if (isProd && (!data.AUTH_SECRET || data.AUTH_SECRET.length < 32)) {
    throw new Error("AUTH_SECRET must be set (≥32 chars) in production");
  }

  cached = {
    ...data,
    isProd,
    authSecret:
      data.AUTH_SECRET ??
      "aegis-dev-secret-change-in-production-32chars",
  };
  return cached;
}

export function resetEnvCache() {
  cached = null;
}
