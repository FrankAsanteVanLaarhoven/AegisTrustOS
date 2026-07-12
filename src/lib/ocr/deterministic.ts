import { z } from "zod";
import type { OcrDocumentKind, OcrField, OcrRawResult } from "@/lib/ports/ocr";

/** Deterministic, testable field extraction from free text (no ML). */
export function parseTextFields(text: string): OcrField[] {
  const fields: OcrField[] = [];
  const t = text ?? "";

  const patterns: { key: string; re: RegExp; conf: number }[] = [
    { key: "siaNumber", re: /SIA[:\s#-]*([A-Z0-9]{6,})/i, conf: 0.92 },
    { key: "dbsNumber", re: /DBS[:\s#-]*([A-Z0-9-]{6,})/i, conf: 0.9 },
    {
      key: "licenceNumber",
      re: /(?:driving\s+licence|license|DL)[:\s#-]*([A-Z0-9]{8,})/i,
      conf: 0.88,
    },
    {
      key: "passportNumber",
      re: /(?:passport)[:\s#-]*([A-Z0-9]{6,9})/i,
      conf: 0.9,
    },
    {
      key: "dateOfBirth",
      re: /(?:DOB|date of birth)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      conf: 0.85,
    },
    {
      key: "expiryDate",
      re: /(?:expir(?:y|es|ation)|valid until)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      conf: 0.86,
    },
    {
      key: "fullName",
      re: /(?:name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
      conf: 0.7,
    },
    {
      key: "email",
      re: /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
      conf: 0.95,
    },
    {
      key: "yearsExperience",
      re: /(\d{1,2})\+?\s*years?/i,
      conf: 0.75,
    },
    {
      key: "nationalInsurance",
      re: /\b([A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D])\b/i,
      conf: 0.8,
    },
  ];

  for (const p of patterns) {
    const m = t.match(p.re);
    if (m?.[1]) {
      fields.push({ key: p.key, value: m[1].trim(), confidence: p.conf });
    }
  }

  return fields;
}

export function inferDocumentKind(
  text: string,
  hintType?: string,
): OcrDocumentKind {
  const h = (hintType ?? "").toUpperCase();
  if (h === "SIA") return "SIA";
  if (h === "DBS") return "DBS";
  if (h === "LICENCE") return "DRIVING_LICENCE";
  if (h === "ID") return "PASSPORT";
  if (h === "INSURANCE") return "INSURANCE";
  if (h === "CERTIFICATE" || h === "AI_SAFETY" || h === "ROBOT_CERT")
    return "CERTIFICATE";

  const t = text.toLowerCase();
  if (t.includes("sia")) return "SIA";
  if (t.includes("dbs") || t.includes("disclosure")) return "DBS";
  if (t.includes("driving") || t.includes("licence") || t.includes("license"))
    return "DRIVING_LICENCE";
  if (t.includes("passport")) return "PASSPORT";
  if (t.includes("insurance")) return "INSURANCE";
  return "UNKNOWN";
}

const dateLike = z
  .string()
  .refine((s) => {
    // DD/MM/YYYY or YYYY-MM-DD-ish
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return !Number.isNaN(Date.parse(s));
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s)) return true;
    return false;
  }, "invalid date");

const validators: Record<string, z.ZodType<string>> = {
  email: z.string().email(),
  siaNumber: z.string().min(6).max(20).regex(/^[A-Z0-9]+$/i),
  dbsNumber: z.string().min(6).max(32),
  licenceNumber: z.string().min(8).max(32).regex(/^[A-Z0-9]+$/i),
  passportNumber: z.string().min(6).max(12).regex(/^[A-Z0-9]+$/i),
  dateOfBirth: dateLike,
  expiryDate: dateLike,
  nationalInsurance: z
    .string()
    .regex(/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i, "invalid NI format"),
  fullName: z.string().min(3).max(120),
  yearsExperience: z.string().regex(/^\d{1,2}$/),
};

export type ValidatedField = OcrField & {
  valid: boolean;
  errors: string[];
  /** Confidence after validation (0 if invalid) */
  validatedConfidence: number;
};

export type DeterministicValidation = {
  fields: ValidatedField[];
  documentKind: OcrDocumentKind;
  /** min of valid field confidences, or engine conf if no fields */
  overallConfidence: number;
  requiresManualReview: boolean;
  reasons: string[];
};

const LOW_CONFIDENCE = 0.75;

export function validateOcrResult(
  raw: OcrRawResult,
  opts?: { lowConfidenceThreshold?: number },
): DeterministicValidation {
  const threshold = opts?.lowConfidenceThreshold ?? LOW_CONFIDENCE;
  const reasons: string[] = [];

  const fields: ValidatedField[] = raw.fields.map((f) => {
    const schema = validators[f.key];
    if (!schema) {
      return {
        ...f,
        valid: true,
        errors: [],
        validatedConfidence: f.confidence,
      };
    }
    const parsed = schema.safeParse(f.value);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message);
      reasons.push(`${f.key}: ${errors.join("; ")}`);
      return {
        ...f,
        valid: false,
        errors,
        validatedConfidence: 0,
      };
    }
    if (f.confidence < threshold) {
      reasons.push(`${f.key}: low OCR confidence (${f.confidence.toFixed(2)})`);
    }
    return {
      ...f,
      value: parsed.data,
      valid: true,
      errors: [],
      validatedConfidence: f.confidence,
    };
  });

  const validConfs = fields
    .filter((f) => f.valid)
    .map((f) => f.validatedConfidence);
  const overall =
    validConfs.length > 0
      ? Math.min(raw.confidence, ...validConfs)
      : raw.confidence;

  if (raw.confidence < threshold) {
    reasons.push(`engine confidence below threshold (${raw.confidence.toFixed(2)})`);
  }
  if (fields.some((f) => !f.valid)) {
    reasons.push("one or more fields failed schema validation");
  }
  if (!fields.length && !raw.rawText.trim()) {
    reasons.push("no text extracted");
  }

  const requiresManualReview =
    overall < threshold ||
    fields.some((f) => !f.valid) ||
    fields.some((f) => f.valid && f.confidence < threshold) ||
    (!fields.length && raw.confidence < 0.9);

  return {
    fields,
    documentKind: raw.documentKind,
    overallConfidence: overall,
    requiresManualReview,
    reasons,
  };
}

/** Merge OCR engine fields with deterministic text parse (text wins on conflict if higher conf). */
export function mergeFields(
  engineFields: OcrField[],
  textFields: OcrField[],
): OcrField[] {
  const map = new Map<string, OcrField>();
  for (const f of engineFields) map.set(f.key, f);
  for (const f of textFields) {
    const prev = map.get(f.key);
    if (!prev || f.confidence >= prev.confidence) map.set(f.key, f);
  }
  return [...map.values()];
}

export function buildExtractionPayload(
  raw: OcrRawResult,
  validation: DeterministicValidation,
) {
  return {
    engine: raw.engine,
    documentKind: validation.documentKind,
    rawText: raw.rawText.slice(0, 4000),
    overallConfidence: validation.overallConfidence,
    requiresManualReview: validation.requiresManualReview,
    reasons: validation.reasons,
    fields: validation.fields,
    disclaimer:
      "OCR/extraction is advisory. Deterministic validation flags issues; humans clear trust.",
  };
}
