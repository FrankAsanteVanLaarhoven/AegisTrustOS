import { getEnv } from "@/config/env";

/**
 * Feature flags — ship dark verticals / partners without deleting code.
 * Override via FEATURE_FLAGS=securityVertical,webhooks or FEATURE_FLAGS=-careVertical
 */
export type FeatureFlags = {
  /** Show security vertical waitlist & allow pre-apply */
  securityVertical: boolean;
  /** Show care vertical waitlist & allow pre-apply */
  careVertical: boolean;
  /** Partner / white-label surfaces */
  partnerWhiteLabel: boolean;
  /** Payment rails (stub only until true) */
  payments: boolean;
  /** Outbound webhooks from outbox publisher */
  webhooks: boolean;
  /** Expose public API v1 partner routes beyond health/me */
  publicApi: boolean;
  /** Allow non-UK jurisdiction packs in UI */
  multiJurisdiction: boolean;
};

const DEFAULTS: FeatureFlags = {
  securityVertical: true,
  careVertical: true,
  partnerWhiteLabel: true,
  payments: false,
  webhooks: false,
  publicApi: true,
  multiJurisdiction: false,
};

export function getFeatures(): FeatureFlags {
  const env = getEnv();
  const flags = { ...DEFAULTS };

  if (!env.FEATURE_FLAGS?.trim()) return flags;

  for (const raw of env.FEATURE_FLAGS.split(",")) {
    const token = raw.trim();
    if (!token) continue;
    const off = token.startsWith("-") || token.startsWith("!");
    const key = (off ? token.slice(1) : token) as keyof FeatureFlags;
    if (key in flags) {
      flags[key] = !off;
    }
  }
  return flags;
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return getFeatures()[flag];
}
