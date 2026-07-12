import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { mkdir, readFile, writeFile, unlink } from "fs/promises";
import path from "path";
import type { ObjectStorage, StoredObject } from "@/lib/ports/storage";
import { getEnv } from "@/config/env";
import { log } from "@/lib/observability/logger";

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/**
 * Local encrypted object store (AES-256-GCM).
 * Production: swap for S3 adapter implementing the same port.
 */
export class EncryptedLocalStorage implements ObjectStorage {
  private root: string;
  private key: Buffer;

  constructor(root?: string) {
    const env = getEnv();
    this.root = root ?? path.join(process.cwd(), "uploads", "secure");
    this.key = keyFromSecret(env.DOCUMENT_ENCRYPTION_KEY || env.authSecret);
  }

  private abs(key: string) {
    const safe = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return path.join(this.root, safe);
  }

  async put(input: {
    key: string;
    data: Buffer;
    contentType: string;
    encrypt?: boolean;
  }): Promise<StoredObject> {
    const encrypt = input.encrypt !== false;
    const full = this.abs(input.key);
    await mkdir(path.dirname(full), { recursive: true });

    let payload = input.data;
    let finalKey = input.key;
    if (encrypt) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", this.key, iv);
      const enc = Buffer.concat([cipher.update(input.data), cipher.final()]);
      const tag = cipher.getAuthTag();
      payload = Buffer.concat([iv, tag, enc]);
      finalKey = input.key.endsWith(".enc") ? input.key : `${input.key}.enc`;
    }

    const dest = this.abs(finalKey);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, payload);

    log.info("storage_put", { key: finalKey, bytes: payload.length, encrypted: encrypt });

    return {
      key: finalKey,
      contentType: input.contentType,
      bytes: payload.length,
      uri: `file://${dest}`,
      encrypted: encrypt,
    };
  }

  async get(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    try {
      const full = this.abs(key);
      const raw = await readFile(full);
      if (key.endsWith(".enc")) {
        const iv = raw.subarray(0, 12);
        const tag = raw.subarray(12, 28);
        const data = raw.subarray(28);
        const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
        decipher.setAuthTag(tag);
        const plain = Buffer.concat([decipher.update(data), decipher.final()]);
        return { data: plain, contentType: "application/octet-stream" };
      }
      return { data: raw, contentType: "application/octet-stream" };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.abs(key));
    } catch {
      /* ignore */
    }
  }
}
