import { nanoid } from "nanoid";
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

export function createNotifier(): Notifier {
  if (process.env.NOTIFY_WEBHOOK_URL) return new WebhookNotifier();
  return new FileNotifier();
}

// silence unused nanoid if tree-shaken differently
void nanoid;
