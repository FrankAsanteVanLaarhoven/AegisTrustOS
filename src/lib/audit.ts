import { db } from "@/lib/db";
import { getContainer } from "@/lib/container";
import type { DomainEventType } from "@/lib/ports/events";

/**
 * Human-readable audit + optional domain event emit.
 * Future: wrap mutation + outbox in a single DB transaction when on Postgres.
 */
export async function writeAudit(input: {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  payload?: Record<string, unknown>;
  ip?: string | null;
  /** If set, also publish to durable outbox */
  eventType?: DomainEventType;
  tenantId?: string | null;
}) {
  const audit = await db.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payloadJson: JSON.stringify(input.payload ?? {}),
      ip: input.ip ?? null,
    },
  });

  if (input.eventType) {
    const { events } = getContainer();
    await events.publish({
      type: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
      tenantId: input.tenantId,
      payload: { action: input.action, ...(input.payload ?? {}) },
    });
  }

  return audit;
}
