import type { ChecklistItem } from "@/lib/compliance/matrix";

export type JurisdictionCode = "UK" | "EU" | "US" | (string & {});

export type JurisdictionPack = {
  code: JurisdictionCode;
  name: string;
  /** Default pilot city / region label */
  defaultLocation: string;
  /** Locale for dates/copy */
  locale: string;
  /** Category slug → checklist overrides or full list */
  getChecklist: (categorySlug: string, base: ChecklistItem[]) => ChecklistItem[];
  disclaimers: string[];
};
