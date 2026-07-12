import { getEnv } from "@/config/env";
import { getIdvProvider, type IdvProvider } from "@/lib/idv/provider";
import type { EventBus } from "@/lib/ports/events";
import { PrismaOutboxEventBus } from "@/lib/adapters/events/prisma-outbox";

/**
 * Composition root — swap adapters via env without touching domain services.
 */
export type AppContainer = {
  idv: IdvProvider;
  events: EventBus;
  jurisdictionDefault: string;
};

let container: AppContainer | null = null;

export function getContainer(): AppContainer {
  if (container) return container;
  const env = getEnv();
  // IDV_VENDOR wired inside getIdvProvider
  void env.IDV_VENDOR;
  container = {
    idv: getIdvProvider(),
    events: new PrismaOutboxEventBus(),
    jurisdictionDefault: env.JURISDICTION_DEFAULT,
  };
  return container;
}

export function resetContainer() {
  container = null;
}
