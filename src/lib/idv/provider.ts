import { getEnv } from "@/config/env";

export type IdvStartInput = {
  fullName: string;
  email: string;
  dateOfBirth?: string;
};

export type IdvSession = {
  sessionId: string;
  vendor: "MOCK" | "TRULIOO" | "SOCURE" | "OTHER";
  status: "PENDING" | "PASSED" | "FAILED" | "EXPIRED";
};

export type IdvResult = {
  sessionId: string;
  status: "PENDING" | "PASSED" | "FAILED" | "EXPIRED";
  livenessScore: number | null;
  raw: Record<string, unknown>;
};

/** Port — implement adapters per vendor; never call vendors from UI. */
export interface IdvProvider {
  startCheck(input: IdvStartInput): Promise<IdvSession>;
  getResult(sessionId: string): Promise<IdvResult>;
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
}

/** Stub — wire real SDK when keys present; keeps compile surface stable. */
export class TruliooStubProvider implements IdvProvider {
  async startCheck(input: IdvStartInput): Promise<IdvSession> {
    return {
      sessionId: `trulioo_stub_${Date.now()}`,
      vendor: "TRULIOO",
      status: "PENDING",
    };
  }
  async getResult(sessionId: string): Promise<IdvResult> {
    return {
      sessionId,
      status: "PASSED",
      livenessScore: null,
      raw: { vendor: "TRULIOO", stub: true, note: "Configure TRULIOO_API_KEY" },
    };
  }
}

export class SocureStubProvider implements IdvProvider {
  async startCheck(input: IdvStartInput): Promise<IdvSession> {
    return {
      sessionId: `socure_stub_${Date.now()}`,
      vendor: "SOCURE",
      status: "PENDING",
    };
  }
  async getResult(sessionId: string): Promise<IdvResult> {
    return {
      sessionId,
      status: "PASSED",
      livenessScore: null,
      raw: { vendor: "SOCURE", stub: true, note: "Configure SOCURE_API_KEY" },
    };
  }
}

export function getIdvProvider(): IdvProvider {
  const vendor = getEnv().IDV_VENDOR;
  switch (vendor) {
    case "TRULIOO":
      return new TruliooStubProvider();
    case "SOCURE":
      return new SocureStubProvider();
    default:
      return new MockIdvProvider();
  }
}
