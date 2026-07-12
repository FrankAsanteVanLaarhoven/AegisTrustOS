import { getEnv } from "@/config/env";
import { ukPack } from "@/config/jurisdictions/uk";
import type { JurisdictionCode, JurisdictionPack } from "@/config/jurisdictions/types";
import type { ChecklistItem } from "@/lib/compliance/matrix";

/** Stubs for multi-jurisdiction future — not active unless multiJurisdiction flag */
const packs: Record<string, JurisdictionPack> = {
  UK: ukPack,
  EU: {
    code: "EU",
    name: "European Union (stub)",
    defaultLocation: "Dublin",
    locale: "en-IE",
    getChecklist: (_s, base) => base,
    disclaimers: ["EU pack is a stub — map local licence types before go-live."],
  },
  US: {
    code: "US",
    name: "United States (stub)",
    defaultLocation: "New York",
    locale: "en-US",
    getChecklist: (_s, base) => base,
    disclaimers: ["US pack is a stub — state-level checks not configured."],
  },
};

export function getJurisdiction(code?: string): JurisdictionPack {
  const env = getEnv();
  const key = (code ?? env.JURISDICTION_DEFAULT ?? "UK").toUpperCase();
  return packs[key] ?? ukPack;
}

export function resolveChecklist(
  categorySlug: string,
  base: ChecklistItem[],
  jurisdiction?: JurisdictionCode,
): ChecklistItem[] {
  return getJurisdiction(jurisdiction).getChecklist(categorySlug, base);
}

export function listJurisdictions(): JurisdictionPack[] {
  return Object.values(packs);
}
