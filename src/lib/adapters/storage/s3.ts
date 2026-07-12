import type { ObjectStorage, StoredObject } from "@/lib/ports/storage";
import { getEnv } from "@/config/env";
import { log } from "@/lib/observability/logger";
import { createHash, createCipheriv, randomBytes } from "crypto";

function encryptAesGcm(data: Buffer, secret: string): Buffer {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

type S3Mod = {
  S3Client: new (cfg: { region: string }) => {
    send: (cmd: unknown) => Promise<{
      Body?: { transformToByteArray?: () => Promise<Uint8Array> };
      ContentType?: string;
    }>;
  };
  PutObjectCommand: new (input: Record<string, unknown>) => unknown;
  GetObjectCommand: new (input: Record<string, unknown>) => unknown;
  DeleteObjectCommand: new (input: Record<string, unknown>) => unknown;
};

async function loadS3Sdk(): Promise<S3Mod> {
  // Avoid static resolve so builds work without the optional dependency installed
  const specifier = "@aws-sdk/" + "client-s3";
  // eslint-disable-next-line no-new-func
  const dynamicImport = new Function("s", "return import(s)") as (
    s: string,
  ) => Promise<S3Mod>;
  return dynamicImport(specifier);
}

/**
 * S3 object storage (optional dependency @aws-sdk/client-s3).
 * Encrypts payloads before upload when encrypt=true.
 */
export class S3ObjectStorage implements ObjectStorage {
  private bucket: string;
  private region: string;
  private secret: string;

  constructor() {
    const env = getEnv();
    if (!env.S3_BUCKET) throw new Error("S3_BUCKET required for s3 storage backend");
    this.bucket = env.S3_BUCKET;
    this.region = env.S3_REGION ?? "eu-west-2";
    this.secret = env.DOCUMENT_ENCRYPTION_KEY || env.authSecret;
  }

  async put(input: {
    key: string;
    data: Buffer;
    contentType: string;
    encrypt?: boolean;
  }): Promise<StoredObject> {
    const encrypt = input.encrypt !== false;
    const key = encrypt && !input.key.endsWith(".enc") ? `${input.key}.enc` : input.key;
    const body = encrypt ? encryptAesGcm(input.data, this.secret) : input.data;
    const aws = await loadS3Sdk();
    const s3 = new aws.S3Client({ region: this.region });
    await s3.send(
      new aws.PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: input.contentType,
        ServerSideEncryption: "AES256",
        Metadata: { aegis_encrypted: encrypt ? "1" : "0" },
      }),
    );
    log.info("s3_put", { bucket: this.bucket, key, bytes: body.length });
    return {
      key,
      contentType: input.contentType,
      bytes: body.length,
      uri: `s3://${this.bucket}/${key}`,
      encrypted: encrypt,
    };
  }

  async get(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    try {
      const aws = await loadS3Sdk();
      const s3 = new aws.S3Client({ region: this.region });
      const out = await s3.send(
        new aws.GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await out.Body?.transformToByteArray?.();
      if (!bytes) return null;
      return {
        data: Buffer.from(bytes),
        contentType: out.ContentType ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const aws = await loadS3Sdk();
    const s3 = new aws.S3Client({ region: this.region });
    await s3.send(
      new aws.DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
