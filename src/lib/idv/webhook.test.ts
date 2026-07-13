import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { MockIdvProvider, getIdvProvider } from "@/lib/idv/provider";
import { resetEnvCache } from "@/config/env";

describe("MockIdvProvider webhook", () => {
  beforeEach(() => {
    resetEnvCache();
    delete process.env.IDV_WEBHOOK_SECRET;
    delete process.env.IDV_VENDOR;
  });
  afterEach(() => {
    resetEnvCache();
    delete process.env.IDV_WEBHOOK_SECRET;
  });

  it("parses session payload without secret in dev", async () => {
    const idv = new MockIdvProvider();
    const payload = await idv.parseWebhook!(
      new Headers({ "content-type": "application/json" }),
      JSON.stringify({
        sessionId: "mock_abc",
        status: "PASSED",
        livenessScore: 0.91,
      }),
    );
    expect(payload).toMatchObject({
      externalRef: "mock_abc",
      status: "PASSED",
      livenessScore: 0.91,
    });
  });

  it("rejects wrong secret when configured", async () => {
    process.env.IDV_WEBHOOK_SECRET = "test-secret";
    resetEnvCache();
    const idv = new MockIdvProvider();
    await expect(
      idv.parseWebhook!(
        new Headers({ "x-aegis-idv-secret": "wrong" }),
        JSON.stringify({ sessionId: "x", status: "PASSED" }),
      ),
    ).rejects.toThrow(/Invalid IDV webhook secret/);
  });

  it("accepts correct plain secret", async () => {
    process.env.IDV_WEBHOOK_SECRET = "test-secret";
    resetEnvCache();
    const idv = new MockIdvProvider();
    const payload = await idv.parseWebhook!(
      new Headers({ "x-aegis-idv-secret": "test-secret" }),
      JSON.stringify({ sessionId: "mock_ok", status: "FAILED" }),
    );
    expect(payload?.status).toBe("FAILED");
  });

  it("getIdvProvider defaults to mock", () => {
    process.env.IDV_VENDOR = "MOCK";
    resetEnvCache();
    expect(getIdvProvider()).toBeInstanceOf(MockIdvProvider);
  });
});
