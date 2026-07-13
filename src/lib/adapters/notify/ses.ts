import { createHash, createHmac } from "crypto";
import type { Notifier, NotifyMessage } from "@/lib/ports/notify";
import { FileNotifier } from "@/lib/adapters/notify/file-notifier";
import { getEnv } from "@/config/env";
import { log } from "@/lib/observability/logger";
import { db } from "@/lib/db";

/**
 * AWS SES v4 signed SendEmail (no SDK dependency).
 * Requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_REGION, NOTIFY_FROM_EMAIL.
 */
export class SesNotifier implements Notifier {
  private fallback = new FileNotifier();
  private accessKey: string;
  private secretKey: string;
  private region: string;
  private from: string;

  constructor() {
    const env = getEnv();
    this.accessKey = process.env.AWS_ACCESS_KEY_ID ?? "";
    this.secretKey = process.env.AWS_SECRET_ACCESS_KEY ?? "";
    this.region = env.SES_REGION ?? env.S3_REGION ?? "eu-west-2";
    this.from = env.NOTIFY_FROM_EMAIL ?? "";
    if (!this.accessKey || !this.secretKey || !this.from) {
      throw new Error(
        "SES requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, NOTIFY_FROM_EMAIL",
      );
    }
  }

  async send(message: NotifyMessage) {
    const base = await this.fallback.send(message);
    if (message.channel !== "email") return base;

    try {
      const params = new URLSearchParams({
        Action: "SendEmail",
        Version: "2010-12-01",
        Source: this.from,
        "Destination.ToAddresses.member.1": message.to,
        "Message.Subject.Data": message.subject,
        "Message.Subject.Charset": "UTF-8",
        "Message.Body.Text.Data": message.body,
        "Message.Body.Text.Charset": "UTF-8",
      });
      const body = params.toString();
      const host = `email.${this.region}.amazonaws.com`;
      const amzDate = new Date()
        .toISOString()
        .replace(/[:-]|\.\d{3}/g, "");
      const dateStamp = amzDate.slice(0, 8);
      const headers = await signSesV4({
        method: "POST",
        host,
        path: "/",
        body,
        region: this.region,
        accessKey: this.accessKey,
        secretKey: this.secretKey,
        amzDate,
        dateStamp,
      });

      const res = await fetch(`https://${host}/`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
        body,
      });

      if (res.ok) {
        await db.notificationOutbox
          .update({
            where: { id: base.id },
            data: { status: "SENT", sentAt: new Date() },
          })
          .catch(() => undefined);
        log.info("notify_ses_sent", { id: base.id });
        return { id: base.id, status: "sent" as const };
      }
      log.warn("notify_ses_failed", {
        status: res.status,
        body: (await res.text().catch(() => "")).slice(0, 200),
      });
    } catch (e) {
      log.warn("notify_ses_error", {
        error: e instanceof Error ? e.message : "unknown",
      });
    }
    return base;
  }
}

async function signSesV4(input: {
  method: string;
  host: string;
  path: string;
  body: string;
  region: string;
  accessKey: string;
  secretKey: string;
  amzDate: string;
  dateStamp: string;
}): Promise<Record<string, string>> {
  const service = "ses";
  const canonicalHeaders = `content-type:application/x-www-form-urlencoded; charset=utf-8\nhost:${input.host}\nx-amz-date:${input.amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const payloadHash = createHash("sha256").update(input.body).digest("hex");
  const canonicalRequest = [
    input.method,
    input.path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${input.dateStamp}/${input.region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    input.amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const kDate = hmac(`AWS4${input.secretKey}`, input.dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");

  return {
    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    Host: input.host,
    "X-Amz-Date": input.amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
