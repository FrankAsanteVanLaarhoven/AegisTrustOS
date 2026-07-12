import { describe, expect, it } from "vitest";
import {
  inferDocumentKind,
  parseTextFields,
  validateOcrResult,
} from "./deterministic";
import { MockOcrAdapter } from "@/lib/adapters/ocr/mock";

describe("parseTextFields", () => {
  it("extracts SIA and email deterministically", () => {
    const fields = parseTextFields(
      "SIA: AB12CD34 contact me@example.com Expiry: 31/12/2027",
    );
    const sia = fields.find((f) => f.key === "siaNumber");
    const email = fields.find((f) => f.key === "email");
    expect(sia?.value).toBe("AB12CD34");
    expect(email?.value).toBe("me@example.com");
  });
});

describe("inferDocumentKind", () => {
  it("uses hint type", () => {
    expect(inferDocumentKind("", "SIA")).toBe("SIA");
    expect(inferDocumentKind("", "DBS")).toBe("DBS");
  });
});

describe("validateOcrResult", () => {
  it("flags invalid email and low confidence for manual review", () => {
    const v = validateOcrResult({
      rawText: "test",
      engine: "test",
      documentKind: "UNKNOWN",
      confidence: 0.5,
      fields: [
        { key: "email", value: "not-an-email", confidence: 0.9 },
        { key: "siaNumber", value: "AB12CD34", confidence: 0.95 },
      ],
    });
    expect(v.fields.find((f) => f.key === "email")?.valid).toBe(false);
    expect(v.requiresManualReview).toBe(true);
    expect(v.reasons.length).toBeGreaterThan(0);
  });

  it("accepts clean SIA extraction", () => {
    const v = validateOcrResult({
      rawText: "SIA: AB12CD34",
      engine: "test",
      documentKind: "SIA",
      confidence: 0.95,
      fields: [{ key: "siaNumber", value: "AB12CD34", confidence: 0.95 }],
    });
    expect(v.fields[0].valid).toBe(true);
    expect(v.requiresManualReview).toBe(false);
  });
});

describe("MockOcrAdapter", () => {
  it("parses free text", async () => {
    const ocr = new MockOcrAdapter();
    const r = await ocr.extract({
      text: "DBS: 001234567 Name: Jane Doe",
      hintType: "DBS",
    });
    expect(r.engine).toBe("mock-ocr-v1");
    expect(r.fields.some((f) => f.key === "dbsNumber")).toBe(true);
  });

  it("simulates image OCR for ID", async () => {
    const ocr = new MockOcrAdapter();
    const r = await ocr.extract({
      image: Buffer.from("fake-jpeg"),
      hintType: "ID",
      fileName: "passport.jpg",
    });
    expect(r.rawText.toLowerCase()).toContain("passport");
    expect(r.fields.length).toBeGreaterThan(0);
  });
});
