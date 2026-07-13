import { nanoid } from "nanoid";
import type { Notifier, NotifyMessage } from "@/lib/ports/notify";
import { FileNotifier } from "@/lib/adapters/notify/file-notifier";
import { getEnv } from "@/config/env";
import { log } from "@/lib/observability/logger";
import { db } from "@/lib/db";

/**
 * Postmark email adapter. Always writes file/DB outbox first; then POSTs
 * when POSTMARK_SERVER_TOKEN is set.
 */
export class PostmarkNotifier implements Notifier {
  private fallback = new FileNotifier();
  private token: string;
  private from: string;

  constructor(token?: string, from?: string) {
    const env = getEnv();
    this.token = token ?? env.POSTMARK_SERVER_TOKEN ?? "";
    this.from = from ?? env.NOTIFY_FROM_EMAIL ?? "noreply@aegis.local";
    if (!this.token) throw new Error("POSTMARK_SERVER_TOKEN required");
  }

  async send(message: NotifyMessage) {
    const base = await this.fallback.send(message);
    if (message.channel !== "email") return base;

    try {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": this.token,
        },
        body: JSON.stringify({
          From: this.from,
          To: message.to,
          Subject: message.subject,
          TextBody: message.body,
          MessageStream: "outbound",
          Tag: message.templateKey ?? "aegis",
          Metadata: {
            aegis_id: base.id,
            ...(message.meta
              ? Object.fromEntries(
                  Object.entries(message.meta).map(([k, v]) => [
                    k,
                    String(v),
                  ]),
                )
              : {}),
          },
        }),
      });
      if (res.ok) {
        await markSent(base.id);
        log.info("notify_postmark_sent", { id: base.id });
        return { id: base.id, status: "sent" as const };
      }
      const errText = await res.text().catch(() => "");
      log.warn("notify_postmark_failed", {
        status: res.status,
        body: errText.slice(0, 200),
      });
    } catch (e) {
      log.warn("notify_postmark_error", {
        error: e instanceof Error ? e.message : "unknown",
      });
    }
    return base;
  }
}

async function markSent(id: string) {
  await db.notificationOutbox
    .update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    })
    .catch(() => undefined);
}

void nanoid;
