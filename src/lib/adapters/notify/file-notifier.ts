import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import type { Notifier, NotifyMessage } from "@/lib/ports/notify";
import { log } from "@/lib/observability/logger";
import { db } from "@/lib/db";

/**
 * Durable notification outbox — writes DB row + NDJSON file.
 * Production: swap for SES / Postmark / Twilio implementing Notifier.
 */
export class FileNotifier implements Notifier {
  private file: string;

  constructor(file?: string) {
    this.file = file ?? path.join(process.cwd(), "uploads", "notify", "outbox.ndjson");
  }

  async send(message: NotifyMessage) {
    const id = `ntf_${nanoid(12)}`;
    const record = {
      id,
      ts: new Date().toISOString(),
      status: "queued" as const,
      ...message,
    };

    try {
      await db.notificationOutbox.create({
        data: {
          id,
          channel: message.channel,
          toAddress: message.to,
          subject: message.subject,
          body: message.body,
          templateKey: message.templateKey ?? null,
          status: "QUEUED",
          metaJson: JSON.stringify(message.meta ?? {}),
        },
      });
    } catch (e) {
      log.warn("notification_db_write_failed", {
        error: e instanceof Error ? e.message : "unknown",
      });
    }

    await mkdir(path.dirname(this.file), { recursive: true });
    await appendFile(this.file, `${JSON.stringify(record)}\n`, "utf8");
    log.info("notification_queued", {
      id,
      channel: message.channel,
      to: message.to,
      subject: message.subject,
    });

    return { id, status: "queued" as const };
  }
}
