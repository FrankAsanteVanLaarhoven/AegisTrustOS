import { db } from "@/lib/db";
import type { DomainEvent, EventBus } from "@/lib/ports/events";
import { log } from "@/lib/observability/logger";

/**
 * Transactional outbox: durable domain events for future webhooks / SIEM / search.
 * Audit trail remains separate (human-readable actions); outbox is machine bus.
 */
export class PrismaOutboxEventBus implements EventBus {
  async publish(event: DomainEvent): Promise<void> {
    await this.publishMany([event]);
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    if (!events.length) return;
    try {
      await db.domainEventOutbox.createMany({
        data: events.map((e) => ({
          type: e.type,
          entityType: e.entityType,
          entityId: e.entityId,
          actorId: e.actorId ?? null,
          tenantId: e.tenantId ?? null,
          payloadJson: JSON.stringify(e.payload ?? {}),
          occurredAt: e.occurredAt ?? new Date(),
        })),
      });
      for (const e of events) {
        log.info("domain_event", {
          type: e.type,
          entityType: e.entityType,
          entityId: e.entityId,
          tenantId: e.tenantId ?? undefined,
        });
      }
    } catch (err) {
      log.error("domain_event_publish_failed", {
        error: err instanceof Error ? err.message : "unknown",
        count: events.length,
      });
      // Do not throw — domain mutation should not fail solely on outbox in MVP
      // (production: same transaction as mutation)
    }
  }
}

export async function listUnpublishedOutbox(limit = 100) {
  return db.domainEventOutbox.findMany({
    where: { publishedAt: null },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function markOutboxPublished(ids: string[]) {
  if (!ids.length) return;
  await db.domainEventOutbox.updateMany({
    where: { id: { in: ids } },
    data: { publishedAt: new Date() },
  });
}
