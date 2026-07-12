import { z } from "zod";

/**
 * Zod-validated environment. Fails fast in production if critical secrets missing.
 * Future-proof: add keys here; never read process.env ad-hoc in domain code.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  AUTH_SECRET: z.string().min(16).optional(),
  NEXTAUTH_URL: z.string().optional(),
  IDV_VENDOR: z.enum(["MOCK", "TRULIOO", "SOCURE"]).default("MOCK"),
  JURISDICTION_DEFAULT: z.string().default("UK"),
  SESSION_MAX_AGE_HOURS: z.coerce.number().min(1).max(168).default(8),
  AUDIT_RETENTION_DAYS: z.coerce.number().min(30).default(2555), // ~7 years default
  RATE_LIMIT_BACKEND: z.enum(["memory", "redis"]).default("memory"),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  APP_VERSION: z.string().optional(),
  /** Comma-separated feature flags override, e.g. "securityVertical,careVertical" */
  FEATURE_FLAGS: z.string().optional(),
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
