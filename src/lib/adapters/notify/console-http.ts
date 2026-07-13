import type { Notifier, NotifyMessage } from "@/lib/ports/notify";
import { FileNotifier } from "@/lib/adapters/notify/file-notifier";
import { getEnv } from "@/config/env";
import { log } from "@/lib/observability/logger";
import { db } from "@/lib/db";

/**
 * HTTP webhook notifier (e.g. Zapier, n8n, internal mailer).
 * Falls back to file outbox always; also POSTs to NOTIFY_WEBHOOK_URL when set.
 */
export class WebhookNotifier implements Notifier {
  private fallback = new FileNotifier();

  async send(message: NotifyMessage) {
    const base = await this.fallback.send(message);
    const url = process.env.NOTIFY_WEBHOOK_URL;
    if (!url) return base;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Aegis-Notify": "1",
        },
        body: JSON.stringify({
          id: base.id,
          ...message,
          env: getEnv().NODE_ENV,
        }),
      });
      if (res.ok) {
        await db.notificationOutbox
          .update({
            where: { id: base.id },
            data: { status: "SENT", sentAt: new Date() },
          })
          .catch(() => undefined);
        log.info("notify_webhook_sent", { id: base.id, status: res.status });
        return { id: base.id, status: "sent" as const };
      }
      log.warn("notify_webhook_failed", { status: res.status });
    } catch (e) {
      log.warn("notify_webhook_error", {
        error: e instanceof Error ? e.message : "unknown",
      });
    }
    return base;
  }
}

/**
 * Composite that tries primary sender; FileNotifier is always the durable base
 * inside Postmark/SES/Webhook adapters.
 */
export function createNotifier(): Notifier {
  const env = getEnv();

  if (env.NOTIFY_BACKEND === "postmark" && env.POSTMARK_SERVER_TOKEN) {
    // Sync façade — first send loads Postmark module
    return lazyNotifier(async () => {
      const { PostmarkNotifier } = await import("@/lib/adapters/notify/postmark");
      return new PostmarkNotifier();
    });
  }

  if (env.NOTIFY_BACKEND === "ses") {
    return lazyNotifier(async () => {
      const { SesNotifier } = await import("@/lib/adapters/notify/ses");
      return new SesNotifier();
    });
  }

  if (env.NOTIFY_BACKEND === "webhook" || env.NOTIFY_WEBHOOK_URL) {
    return new WebhookNotifier();
  }

  return new FileNotifier();
}

function lazyNotifier(factory: () => Promise<Notifier>): Notifier {
  let inner: Notifier | null = null;
  let failed: Notifier | null = null;
  return {
    async send(message) {
      if (failed) return failed.send(message);
      try {
        if (!inner) inner = await factory();
        return await inner.send(message);
      } catch (e) {
        log.warn("notify_adapter_fallback_file", {
          error: e instanceof Error ? e.message : "unknown",
        });
        failed = new FileNotifier();
        return failed.send(message);
      }
    },
  };
}
