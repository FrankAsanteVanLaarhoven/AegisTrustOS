import { createHmac, timingSafeEqual } from "crypto";
import { getEnv } from "@/config/env";
import { log } from "@/lib/observability/logger";

export type IdvStartInput = {
  fullName: string;
  email: string;
  dateOfBirth?: string;
};

export type IdvSession = {
  sessionId: string;
  vendor: "MOCK" | "TRULIOO" | "SOCURE" | "OTHER";
  status: "PENDING" | "PASSED" | "FAILED" | "EXPIRED";
  /** Hosted verification URL when vendor supports redirect flow */
  redirectUrl?: string;
};

export type IdvResult = {
  sessionId: string;
  status: "PENDING" | "PASSED" | "FAILED" | "EXPIRED";
  livenessScore: number | null;
  raw: Record<string, unknown>;
};

export type IdvWebhookPayload = {
  externalRef: string;
  status: IdvResult["status"];
  livenessScore?: number | null;
  raw: Record<string, unknown>;
};

/** Port — implement adapters per vendor; never call vendors from UI. */
export interface IdvProvider {
  startCheck(input: IdvStartInput): Promise<IdvSession>;
  getResult(sessionId: string): Promise<IdvResult>;
  /** Parse + validate vendor webhook body. Returns null if not applicable. */
  parseWebhook?(
    headers: Headers,
    rawBody: string,
  ): Promise<IdvWebhookPayload | null>;
}

export class MockIdvProvider implements IdvProvider {
  async startCheck(input: IdvStartInput): Promise<IdvSession> {
    const sessionId = `mock_${Buffer.from(input.email).toString("base64url").slice(0, 12)}_${Date.now()}`;
    return { sessionId, vendor: "MOCK", status: "PENDING" };
  }

  async getResult(sessionId: string): Promise<IdvResult> {
    const fail = sessionId.toLowerCase().includes("fail");
    return {
      sessionId,
      status: fail ? "FAILED" : "PASSED",
      livenessScore: fail ? 0.21 : 0.97,
      raw: {
        vendor: "MOCK",
        simulated: true,
        checkedAt: new Date().toISOString(),
        documentAuthenticity: fail ? "fail" : "pass",
        faceMatch: fail ? "fail" : "pass",
      },
    };
  }

  async parseWebhook(
    headers: Headers,
    rawBody: string,
  ): Promise<IdvWebhookPayload | null> {
    // Dev/test webhook: { sessionId, status?, livenessScore? } with X-Aegis-Idv-Secret
    const secret = getEnv().IDV_WEBHOOK_SECRET;
    if (secret) {
      const hdr = headers.get("x-aegis-idv-secret") ?? "";
      if (!safeEqual(hdr, secret)) {
        throw new Error("Invalid IDV webhook secret");
      }
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return null;
    }
    const sessionId = String(body.sessionId ?? body.externalRef ?? "");
    if (!sessionId) return null;
    const statusRaw = String(body.status ?? "PASSED").toUpperCase();
    const status =
      statusRaw === "FAILED" || statusRaw === "EXPIRED" || statusRaw === "PENDING"
        ? (statusRaw as IdvResult["status"])
        : "PASSED";
    return {
      externalRef: sessionId,
      status,
      livenessScore:
        typeof body.livenessScore === "number" ? body.livenessScore : null,
      raw: { vendor: "MOCK", ...body },
    };
  }
}

/**
 * Trulioo-shaped adapter.
 * Without TRULIOO_API_KEY operates in stub mode (PENDING until webhook).
 * With key, POSTs to configurable base URL (default sandbox-shaped).
 */
export class TruliooProvider implements IdvProvider {
  private apiKey: string | undefined;
  private baseUrl: string;

  constructor() {
    const env = getEnv();
    this.apiKey = env.TRULIOO_API_KEY;
    this.baseUrl =
      env.TRULIOO_BASE_URL ?? "https://api.globaldatacompany.com";
  }

  async startCheck(input: IdvStartInput): Promise<IdvSession> {
    if (!this.apiKey) {
      const sessionId = `trulioo_stub_${Date.now()}`;
      log.info("idv_trulioo_stub_start", { email: input.email });
      return {
        sessionId,
        vendor: "TRULIOO",
        status: "PENDING",
        redirectUrl: undefined,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/verifications/v1/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trulioo-api-key": this.apiKey,
        },
        body: JSON.stringify({
          AcceptTruliooTermsAndConditions: true,
          CountryCode: "GB",
          DataFields: {
            PersonInfo: {
              FirstGivenName: input.fullName.split(" ")[0],
              FirstSurName: input.fullName.split(" ").slice(1).join(" ") || input.fullName,
              YearOfBirth: input.dateOfBirth?.slice(0, 4),
            },
            Communication: { EmailAddress: input.email },
          },
          VerboseMode: true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const sessionId = String(
        json.TransactionID ?? json.transactionId ?? `trulioo_${Date.now()}`,
      );
      return {
        sessionId,
        vendor: "TRULIOO",
        status: "PENDING",
      };
    } catch (e) {
      log.warn("idv_trulioo_start_failed", {
        error: e instanceof Error ? e.message : "unknown",
      });
      return {
        sessionId: `trulioo_err_${Date.now()}`,
        vendor: "TRULIOO",
        status: "PENDING",
      };
    }
  }

  async getResult(sessionId: string): Promise<IdvResult> {
    if (!this.apiKey || sessionId.startsWith("trulioo_stub")) {
      return {
        sessionId,
        status: "PENDING",
        livenessScore: null,
        raw: {
          vendor: "TRULIOO",
          stub: true,
          note: "Await webhook or configure TRULIOO_API_KEY",
        },
      };
    }
    try {
      const res = await fetch(
        `${this.baseUrl}/verifications/v1/transactionrecord/${encodeURIComponent(sessionId)}`,
        { headers: { "x-trulioo-api-key": this.apiKey } },
      );
      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const record = (json.Record ?? json) as Record<string, unknown>;
      const match = String(record.RecordStatus ?? "").toLowerCase();
      const status: IdvResult["status"] =
        match.includes("match") || match === "pass"
          ? "PASSED"
          : match.includes("nomatch") || match === "fail"
            ? "FAILED"
            : "PENDING";
      return {
        sessionId,
        status,
        livenessScore: null,
        raw: { vendor: "TRULIOO", ...json },
      };
    } catch (e) {
      return {
        sessionId,
        status: "PENDING",
        livenessScore: null,
        raw: {
          vendor: "TRULIOO",
          error: e instanceof Error ? e.message : "unknown",
        },
      };
    }
  }

  async parseWebhook(
    headers: Headers,
    rawBody: string,
  ): Promise<IdvWebhookPayload | null> {
    verifyHmacOrSecret(headers, rawBody);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return null;
    }
    const externalRef = String(
      body.TransactionID ?? body.transactionId ?? body.sessionId ?? "",
    );
    if (!externalRef) return null;
    const recordStatus = String(
      body.RecordStatus ?? body.status ?? "PENDING",
    ).toLowerCase();
    const status: IdvResult["status"] =
      recordStatus.includes("match") || recordStatus === "passed"
        ? "PASSED"
        : recordStatus.includes("nomatch") || recordStatus === "failed"
          ? "FAILED"
          : "PENDING";
    return {
      externalRef,
      status,
      livenessScore: null,
      raw: { vendor: "TRULIOO", ...body },
    };
  }
}

/**
 * Socure-shaped adapter (Document + DocV / Sigma).
 */
export class SocureProvider implements IdvProvider {
  private apiKey: string | undefined;
  private baseUrl: string;

  constructor() {
    const env = getEnv();
    this.apiKey = env.SOCURE_API_KEY;
    this.baseUrl = env.SOCURE_BASE_URL ?? "https://service.socure.com";
  }

  async startCheck(input: IdvStartInput): Promise<IdvSession> {
    if (!this.apiKey) {
      return {
        sessionId: `socure_stub_${Date.now()}`,
        vendor: "SOCURE",
        status: "PENDING",
      };
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/5.0/documents/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `SocureApiKey ${this.apiKey}`,
        },
        body: JSON.stringify({
          firstName: input.fullName.split(" ")[0],
          surName: input.fullName.split(" ").slice(1).join(" ") || input.fullName,
          email: input.email,
          dob: input.dateOfBirth,
          documentType: "license",
          country: "GB",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const sessionId = String(
        json.referenceId ?? json.docvTransactionToken ?? `socure_${Date.now()}`,
      );
      const redirectUrl =
        typeof json.eventUrl === "string" ? json.eventUrl : undefined;
      return {
        sessionId,
        vendor: "SOCURE",
        status: "PENDING",
        redirectUrl,
      };
    } catch (e) {
      log.warn("idv_socure_start_failed", {
        error: e instanceof Error ? e.message : "unknown",
      });
      return {
        sessionId: `socure_err_${Date.now()}`,
        vendor: "SOCURE",
        status: "PENDING",
      };
    }
  }

  async getResult(sessionId: string): Promise<IdvResult> {
    if (!this.apiKey || sessionId.startsWith("socure_stub")) {
      return {
        sessionId,
        status: "PENDING",
        livenessScore: null,
        raw: {
          vendor: "SOCURE",
          stub: true,
          note: "Await webhook or configure SOCURE_API_KEY",
        },
      };
    }
    return {
      sessionId,
      status: "PENDING",
      livenessScore: null,
      raw: { vendor: "SOCURE", note: "Prefer webhook over poll" },
    };
  }

  async parseWebhook(
    headers: Headers,
    rawBody: string,
  ): Promise<IdvWebhookPayload | null> {
    verifyHmacOrSecret(headers, rawBody);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return null;
    }
    const event = (body.event ?? body) as Record<string, unknown>;
    const externalRef = String(
      event.referenceId ??
        event.docvTransactionToken ??
        body.referenceId ??
        body.sessionId ??
        "",
    );
    if (!externalRef) return null;
    const decision = String(
      event.decision ?? event.eventType ?? body.status ?? "",
    ).toLowerCase();
    const status: IdvResult["status"] =
      decision.includes("accept") || decision === "passed"
        ? "PASSED"
        : decision.includes("reject") || decision === "failed"
          ? "FAILED"
          : "PENDING";
    const score =
      typeof event.score === "number"
        ? event.score
        : typeof event.livenessScore === "number"
          ? event.livenessScore
          : null;
    return {
      externalRef,
      status,
      livenessScore: score,
      raw: { vendor: "SOCURE", ...body },
    };
  }
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function verifyHmacOrSecret(headers: Headers, rawBody: string) {
  const secret = getEnv().IDV_WEBHOOK_SECRET;
  if (!secret) return; // open in dev when unset
  const hmacHdr =
    headers.get("x-aegis-idv-signature") ??
    headers.get("x-signature") ??
    headers.get("x-socure-signature");
  const plain = headers.get("x-aegis-idv-secret");
  if (plain && safeEqual(plain, secret)) return;
  if (hmacHdr) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const cleaned = hmacHdr.replace(/^sha256=/, "");
    if (safeEqual(cleaned, expected)) return;
  }
  throw new Error("Invalid IDV webhook signature");
}

export function getIdvProvider(): IdvProvider {
  const vendor = getEnv().IDV_VENDOR;
  switch (vendor) {
    case "TRULIOO":
      return new TruliooProvider();
    case "SOCURE":
      return new SocureProvider();
    default:
      return new MockIdvProvider();
  }
}

/** @deprecated alias */
export const TruliooStubProvider = TruliooProvider;
/** @deprecated alias */
export const SocureStubProvider = SocureProvider;
