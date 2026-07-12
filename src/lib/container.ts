import { getEnv } from "@/config/env";
import { getIdvProvider, type IdvProvider } from "@/lib/idv/provider";
import type { EventBus } from "@/lib/ports/events";
import type { ObjectStorage } from "@/lib/ports/storage";
import type { Notifier } from "@/lib/ports/notify";
import type { PaymentsPort } from "@/lib/ports/payments";
import { PrismaOutboxEventBus } from "@/lib/adapters/events/prisma-outbox";
import { EncryptedLocalStorage } from "@/lib/adapters/storage/encrypted-local";
import { FileNotifier } from "@/lib/adapters/notify/file-notifier";
import { StubPayments } from "@/lib/adapters/payments/stub";

/**
 * Composition root — swap adapters via env without touching domain services.
 */
export type AppContainer = {
  idv: IdvProvider;
  events: EventBus;
  storage: ObjectStorage;
  notify: Notifier;
  payments: PaymentsPort;
  jurisdictionDefault: string;
};

let container: AppContainer | null = null;

export function getContainer(): AppContainer {
  if (container) return container;
  const env = getEnv();
  void env.IDV_VENDOR;
  void env.STORAGE_BACKEND;
  void env.NOTIFY_BACKEND;
  void env.PAYMENTS_BACKEND;

  container = {
    idv: getIdvProvider(),
    events: new PrismaOutboxEventBus(),
    storage: new EncryptedLocalStorage(),
    notify: new FileNotifier(),
    payments: new StubPayments(),
    jurisdictionDefault: env.JURISDICTION_DEFAULT,
  };
  return container;
}

export function resetContainer() {
  container = null;
}
