export type OcrDocumentKind =
  | "PASSPORT"
  | "DRIVING_LICENCE"
  | "DBS"
  | "SIA"
  | "CERTIFICATE"
  | "INSURANCE"
  | "UNKNOWN";

export type OcrField = {
  key: string;
  value: string;
  /** 0–1 model/read confidence before deterministic validation */
  confidence: number;
};

export type OcrRawResult = {
  rawText: string;
  fields: OcrField[];
  documentKind: OcrDocumentKind;
  /** Overall engine confidence 0–1 */
  confidence: number;
  engine: string;
};

export type OcrInput = {
  /** Plain text notes / pasted CV content */
  text?: string;
  /** Optional image bytes (camera/PDF page raster) */
  image?: Buffer;
  contentType?: string;
  /** Hint from credential type */
  hintType?: string;
  fileName?: string;
};

export interface OcrPort {
  extract(input: OcrInput): Promise<OcrRawResult>;
}
