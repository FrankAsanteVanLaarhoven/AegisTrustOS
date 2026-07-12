import { getContainer } from "@/lib/container";
import {
  buildExtractionPayload,
  validateOcrResult,
  type DeterministicValidation,
} from "@/lib/ocr/deterministic";
import type { OcrRawResult } from "@/lib/ports/ocr";
import { log } from "@/lib/observability/logger";

export type ExtractionResult = {
  raw: OcrRawResult;
  validation: DeterministicValidation;
  payload: ReturnType<typeof buildExtractionPayload>;
  /** Suggested credential verification status */
  suggestedStatus: "PENDING" | "AI_FLAGGED";
};

/**
 * OCR (read) → deterministic validate → advisory payload for wallet/ops.
 * Never grants trust clearance.
 */
export async function runExtraction(input: {
  text?: string;
  image?: Buffer;
  contentType?: string;
  hintType?: string;
  fileName?: string;
}): Promise<ExtractionResult> {
  const { ocr } = getContainer();
  const raw = await ocr.extract({
    text: input.text,
    image: input.image,
    contentType: input.contentType,
    hintType: input.hintType,
    fileName: input.fileName,
  });
  const validation = validateOcrResult(raw);
  const payload = buildExtractionPayload(raw, validation);
  const suggestedStatus = validation.requiresManualReview
    ? "AI_FLAGGED"
    : "PENDING";

  log.info("ocr_extraction", {
    engine: raw.engine,
    kind: validation.documentKind,
    confidence: validation.overallConfidence,
    manual: validation.requiresManualReview,
    fieldCount: validation.fields.length,
  });

  return { raw, validation, payload, suggestedStatus };
}

export function pickNumberFromExtraction(
  payload: ExtractionResult["payload"],
): string | undefined {
  const prefer = [
    "siaNumber",
    "dbsNumber",
    "licenceNumber",
    "passportNumber",
    "nationalInsurance",
  ];
  for (const key of prefer) {
    const f = payload.fields.find((x) => x.key === key && x.valid && x.value);
    if (f) return f.value;
  }
  return undefined;
}
