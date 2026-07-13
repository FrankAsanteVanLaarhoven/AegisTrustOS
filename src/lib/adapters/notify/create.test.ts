import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createNotifier } from "@/lib/adapters/notify/console-http";
import { FileNotifier } from "@/lib/adapters/notify/file-notifier";
import { resetEnvCache } from "@/config/env";

describe("createNotifier", () => {
  beforeEach(() => {
    resetEnvCache();
    delete process.env.NOTIFY_BACKEND;
    delete process.env.NOTIFY_WEBHOOK_URL;
    delete process.env.POSTMARK_SERVER_TOKEN;
  });
  afterEach(() => {
    resetEnvCache();
    delete process.env.NOTIFY_BACKEND;
    delete process.env.NOTIFY_WEBHOOK_URL;
    delete process.env.POSTMARK_SERVER_TOKEN;
  });

  it("defaults to file notifier", () => {
    process.env.NOTIFY_BACKEND = "file";
    resetEnvCache();
    expect(createNotifier()).toBeInstanceOf(FileNotifier);
  });

  it("uses webhook when URL set", () => {
    process.env.NOTIFY_WEBHOOK_URL = "https://example.com/hook";
    process.env.NOTIFY_BACKEND = "webhook";
    resetEnvCache();
    const n = createNotifier();
    expect(n.constructor.name).toBe("WebhookNotifier");
  });
});
