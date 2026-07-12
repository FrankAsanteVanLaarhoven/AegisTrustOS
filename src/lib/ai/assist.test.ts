import { describe, expect, it } from "vitest";
import {
  advisoryRiskScore,
  buildAssessment,
  extractCredentialHints,
  detectInconsistencies,
} from "./assist";
import type { ChecklistItem } from "@/lib/compliance/matrix";

describe("extractCredentialHints", () => {
  it("extracts SIA and years", () => {
    const h = extractCredentialHints("SIA: AB12CD34 with 8 years experience");
    expect(h.siaNumber).toBe("AB12CD34");
    expect(h.yearsExperience).toBe("8");
  });
});

describe("detectInconsistencies", () => {
  it("flags security without SIA", () => {
    const signals = detectInconsistencies({
      claimedCategories: ["concierge-security"],
      credentials: [
        { type: "ID", verificationStatus: "PENDING" },
        { type: "RTW", verificationStatus: "PENDING" },
      ],
    });
    expect(signals.some((s) => s.code === "MISSING_SIA")).toBe(true);
  });
});

describe("advisoryRiskScore", () => {
  it("increases with high signals", () => {
    const low = advisoryRiskScore([], 0);
    const high = advisoryRiskScore(
      [{ code: "X", severity: "high", message: "x" }],
      2,
    );
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(100);
  });
});

describe("buildAssessment", () => {
  const checklist: ChecklistItem[] = [
    { type: "ID", label: "ID", required: true },
    { type: "RTW", label: "RTW", required: true },
    { type: "REFERENCE", label: "Refs", required: true, minCount: 2 },
  ];

  it("reports missing required credentials", () => {
    const a = buildAssessment({
      checklist,
      credentials: [{ type: "ID", verificationStatus: "PENDING" }],
      claimedCategories: ["personal-assistant"],
      bio: "Experienced PA",
    });
    expect(a.missing.length).toBeGreaterThan(0);
    expect(a.disclaimer).toMatch(/Advisory only/i);
  });
});
