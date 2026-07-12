import type { JurisdictionPack } from "@/config/jurisdictions/types";
import type { ChecklistItem } from "@/lib/compliance/matrix";

/** UK pack — current production vocabulary (DBS, SIA, RTW). */
export const ukPack: JurisdictionPack = {
  code: "UK",
  name: "United Kingdom",
  defaultLocation: "London",
  locale: "en-GB",
  getChecklist(categorySlug: string, base: ChecklistItem[]) {
    // Base matrix already UK-shaped; pack can tighten per slug later
    void categorySlug;
    return base;
  },
  disclaimers: [
    "Platform facilitates evidence collection and human review.",
    "Not a substitute for CQC registration, SIA employment advice, or solicitor-drafted contracts.",
  ],
};
