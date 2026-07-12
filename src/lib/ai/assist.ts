import type { CredentialType } from "@prisma/client";
import {
  type ChecklistItem,
  type ChecklistResult,
  type CredentialLike,
  evaluateChecklist,
  missingRequired,
} from "@/lib/compliance/matrix";
import { parseTextFields } from "@/lib/ocr/deterministic";

export type AiSignal = {
  code: string;
  severity: "info" | "warn" | "high";
  message: string;
};

export type AdvisoryAssessment = {
  riskScore: number;
  signals: AiSignal[];
  missing: ChecklistResult[];
  checklist: ChecklistResult[];
  extractedHints: Record<string, string>;
  triagePriority: number;
  disclaimer: string;
};

const DISCLAIMER =
  "Advisory only. Automated document triage never clears or rejects applicants. Human adjudication required.";

/** Deterministic free-text field parse (shared with OCR pipeline). */
export function extractCredentialHints(text: string): Record<string, string> {
  const hints: Record<string, string> = {};
  for (const f of parseTextFields(text ?? "")) {
    hints[f.key] = f.value;
  }
  return hints;
}

export function detectInconsistencies(input: {
  claimedCategories: string[];
  credentials: CredentialLike[];
  bio?: string | null;
  skills?: string[];
}): AiSignal[] {
  const signals: AiSignal[] = [];
  const types = new Set(input.credentials.map((c) => c.type));

  const securitySlugs = ["concierge-security", "event-security", "vetted-driver"];
  if (input.claimedCategories.some((s) => securitySlugs.includes(s)) && !types.has("SIA")) {
    signals.push({
      code: "MISSING_SIA",
      severity: "high",
      message: "Security-adjacent category claimed without SIA licence credential.",
    });
  }

  const careSlugs = ["home-care", "live-in-care", "specialist-carer"];
  if (input.claimedCategories.some((s) => careSlugs.includes(s))) {
    if (!types.has("DBS")) {
      signals.push({
        code: "MISSING_DBS",
        severity: "high",
        message: "Care category claimed without Enhanced DBS evidence.",
      });
    }
    if (!types.has("SAFEGUARDING")) {
      signals.push({
        code: "MISSING_SAFEGUARDING",
        severity: "high",
        message: "Care category claimed without safeguarding training evidence.",
      });
    }
  }

  const robotSlugs = [
    "robot-home-helper",
    "robot-retail-assistant",
    "robot-commercial-facility",
    "robot-care-home-support",
  ];
  if (input.claimedCategories.some((s) => robotSlugs.includes(s))) {
    if (!types.has("AI_SAFETY")) {
      signals.push({
        code: "MISSING_AI_SAFETY",
        severity: "high",
        message: "Robot service claimed without AI safety governance evidence.",
      });
    }
    if (!types.has("POLICY_CLEARANCE")) {
      signals.push({
        code: "MISSING_POLICY_CLEARANCE",
        severity: "high",
        message: "Robot service claimed without site/policy clearance evidence.",
      });
    }
    if (!types.has("ROBOT_CERT")) {
      signals.push({
        code: "MISSING_ROBOT_CERT",
        severity: "high",
        message: "Robot service claimed without platform safety/conformity evidence.",
      });
    }
  }
  if (
    input.claimedCategories.includes("robot-care-home-support") &&
    !types.has("SAFEGUARDING")
  ) {
    signals.push({
      code: "ROBOT_CARE_NO_SAFEGUARDING",
      severity: "high",
      message: "Care-home robot deployment requires safeguarding evidence for operators.",
    });
  }

  if (input.claimedCategories.includes("chauffeur") && !types.has("LICENCE")) {
    signals.push({
      code: "MISSING_LICENCE",
      severity: "warn",
      message: "Chauffeur category without driving licence credential.",
    });
  }

  const refCount = input.credentials.filter((c) => c.type === "REFERENCE").length;
  if (refCount < 2) {
    signals.push({
      code: "LOW_REFERENCES",
      severity: "warn",
      message: `Only ${refCount} reference(s) on file; two required for standard clearance.`,
    });
  }

  if (!types.has("ID") || !types.has("RTW")) {
    signals.push({
      code: "IDENTITY_INCOMPLETE",
      severity: "high",
      message: "Identity or right-to-work evidence incomplete.",
    });
  }

  const bio = (input.bio ?? "").toLowerCase();
  if (bio.includes("sia") && !types.has("SIA")) {
    signals.push({
      code: "BIO_SIA_MISMATCH",
      severity: "warn",
      message: "Bio mentions SIA but no SIA credential uploaded.",
    });
  }

  if ((input.skills ?? []).includes("security") && !types.has("SIA")) {
    signals.push({
      code: "SKILL_SECURITY_NO_SIA",
      severity: "warn",
      message: "Skills list includes security without SIA credential.",
    });
  }

  return signals;
}

/** Advisory risk score 0–100 (lower = lower risk). Never used for auto-clear. */
export function advisoryRiskScore(signals: AiSignal[], missingCount: number): number {
  let score = 25;
  for (const s of signals) {
    if (s.severity === "high") score += 18;
    else if (s.severity === "warn") score += 10;
    else score += 3;
  }
  score += missingCount * 8;
  return Math.max(0, Math.min(100, score));
}

/** Higher = review sooner */
export function triagePriority(riskScore: number, signals: AiSignal[]): number {
  const high = signals.filter((s) => s.severity === "high").length;
  return Math.round(riskScore + high * 15);
}

export function buildAssessment(input: {
  checklist: ChecklistItem[];
  credentials: CredentialLike[];
  claimedCategories: string[];
  bio?: string | null;
  skills?: string[];
  freeText?: string;
}): AdvisoryAssessment {
  const checklist = evaluateChecklist(input.checklist, input.credentials);
  const missing = missingRequired(checklist);
  const extractedHints = extractCredentialHints(input.freeText ?? input.bio ?? "");
  const signals = detectInconsistencies({
    claimedCategories: input.claimedCategories,
    credentials: input.credentials,
    bio: input.bio,
    skills: input.skills,
  });

  if (Object.keys(extractedHints).length) {
    signals.push({
      code: "EXTRACTION_HINTS",
      severity: "info",
      message: `Extracted field hints: ${Object.keys(extractedHints).join(", ")}`,
    });
  }

  const riskScore = advisoryRiskScore(signals, missing.length);
  return {
    riskScore,
    signals,
    missing,
    checklist,
    extractedHints,
    triagePriority: triagePriority(riskScore, signals),
    disclaimer: DISCLAIMER,
  };
}

export function requiredTypesFromChecklist(checklist: ChecklistItem[]): CredentialType[] {
  return checklist.filter((c) => c.required).map((c) => c.type);
}
