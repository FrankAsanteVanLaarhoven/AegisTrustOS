import type { OcrInput, OcrPort, OcrRawResult } from "@/lib/ports/ocr";
import {
  inferDocumentKind,
  mergeFields,
  parseTextFields,
} from "@/lib/ocr/deterministic";

/**
 * Mock OCR — deterministic text parse + simulated image OCR.
 * Production: Textract / Document AI / IDV vendor OCR implementing OcrPort.
 */
export class MockOcrAdapter implements OcrPort {
  async extract(input: OcrInput): Promise<OcrRawResult> {
    const textParts = [input.text ?? "", input.fileName ?? "", input.hintType ?? ""];
    let rawText = textParts.filter(Boolean).join("\n");

    // Simulated OCR from image presence: inject structured markers for demo
    if (input.image && input.image.length > 0) {
      const hint = (input.hintType ?? "ID").toUpperCase();
      const simulated = simulateImageOcr(hint, input.fileName);
      rawText = [rawText, simulated].filter(Boolean).join("\n");
    }

    const documentKind = inferDocumentKind(rawText, input.hintType);
    const textFields = parseTextFields(rawText);
    const engineFields =
      input.image && input.image.length > 0
        ? textFields.map((f) => ({
            ...f,
            // Image OCR typically slightly lower conf than clean text
            confidence: Math.max(0.55, f.confidence - 0.08),
          }))
        : textFields;

    const fields = mergeFields(engineFields, textFields);
    const confidence =
      fields.length > 0
        ? fields.reduce((s, f) => s + f.confidence, 0) / fields.length
        : rawText.trim()
          ? 0.6
          : 0.2;

    return {
      rawText,
      fields,
      documentKind,
      confidence: Math.round(confidence * 1000) / 1000,
      engine: "mock-ocr-v1",
    };
  }
}

function simulateImageOcr(hint: string, fileName?: string): string {
  // Deterministic pseudo-OCR lines so pipeline is exercisable without a real engine
  const seed = (fileName ?? hint).length;
  if (hint === "SIA" || hint.includes("SIA")) {
    return `SIA Licence\nSIA: AB${100000 + seed}\nName: Sample Holder\nExpiry: 31/12/2027`;
  }
  if (hint === "DBS") {
    return `Disclosure and Barring Service\nDBS: 00${2000000 + seed}\nDate of birth: 01/01/1990`;
  }
  if (hint === "LICENCE") {
    return `UK Driving Licence\nLicence: MORGA753116SM9IJ${seed % 10}\nExpiry: 01/06/2028`;
  }
  if (hint === "INSURANCE") {
    return `Certificate of Insurance\nPolicy: PL-${3000 + seed}\nValid until: 15/03/2027`;
  }
  // Default photo ID
  return `PASSPORT\nPassport: 5${4000000 + seed}\nName: Sample Holder\nDate of birth: 12/05/1992\nExpiry: 12/05/2032`;
}
