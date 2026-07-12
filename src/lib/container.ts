import { getEnv } from "@/config/env";
import { getIdvProvider, type IdvProvider } from "@/lib/idv/provider";
import type { EventBus } from "@/lib/ports/events";
import type { ObjectStorage } from "@/lib/ports/storage";
import type { Notifier } from "@/lib/ports/notify";
import type { PaymentsPort } from "@/lib/ports/payments";
import type { OcrPort } from "@/lib/ports/ocr";
import { PrismaOutboxEventBus } from "@/lib/adapters/events/prisma-outbox";
import { EncryptedLocalStorage } from "@/lib/adapters/storage/encrypted-local";
import { createNotifier } from "@/lib/adapters/notify/console-http";
import { StubPayments } from "@/lib/adapters/payments/stub";
import { StripePayments } from "@/lib/adapters/payments/stripe";
import { MockOcrAdapter } from "@/lib/adapters/ocr/mock";
import { log } from "@/lib/observability/logger";

export type AppContainer = {
  idv: IdvProvider;
  events: EventBus;
  storage: ObjectStorage;
  notify: Notifier;
  payments: PaymentsPort;
  ocr: OcrPort;
  jurisdictionDefault: string;
};

let container: AppContainer | null = null;

async function buildS3Storage(): Promise<ObjectStorage> {
  const mod = await import("@/lib/adapters/storage/s3");
  return new mod.S3ObjectStorage();
}

function buildStorage(): ObjectStorage {
  const env = getEnv();
  if (env.STORAGE_BACKEND === "s3") {
    // Sync façade that lazy-loads S3; first put/get awaits dynamic module
    const local = new EncryptedLocalStorage();
    let s3: ObjectStorage | null = null;
    const ensure = async () => {
      if (!s3) {
        try {
          s3 = await buildS3Storage();
        } catch (e) {
          log.warn("s3_storage_fallback_local", {
            error: e instanceof Error ? e.message : "unknown",
          });
          s3 = local;
        }
      }
      return s3;
    };
    return {
      async put(input) {
        return (await ensure()).put(input);
      },
      async get(key) {
        return (await ensure()).get(key);
      },
      async delete(key) {
        return (await ensure()).delete(key);
      },
    };
  }
  return new EncryptedLocalStorage();
}

function buildPayments(): PaymentsPort {
  const env = getEnv();
  if (env.PAYMENTS_BACKEND === "stripe" && env.STRIPE_SECRET_KEY) {
    try {
      return new StripePayments(env.STRIPE_SECRET_KEY);
    } catch (e) {
      log.warn("stripe_fallback_stub", {
        error: e instanceof Error ? e.message : "unknown",
      });
      return new StubPayments();
    }
  }
  return new StubPayments();
}

export function getContainer(): AppContainer {
  if (container) return container;
  const env = getEnv();
  void env.IDV_VENDOR;

  container = {
    idv: getIdvProvider(),
    events: new PrismaOutboxEventBus(),
    storage: buildStorage(),
    notify: createNotifier(),
    payments: buildPayments(),
    ocr: new MockOcrAdapter(), // OCR_BACKEND=textract later
    jurisdictionDefault: env.JURISDICTION_DEFAULT,
  };
  return container;
}

export function resetContainer() {
  container = null;
}
