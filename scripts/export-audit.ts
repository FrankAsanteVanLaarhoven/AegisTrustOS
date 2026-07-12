/**
 * Export audit trail as SIEM-friendly NDJSON (stdout).
 * Usage: npx tsx scripts/export-audit.ts > audit.ndjson
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const [audits, events] = await Promise.all([
    db.auditEvent.findMany({ orderBy: { createdAt: "asc" } }),
    db.domainEventOutbox.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  for (const a of audits) {
    console.log(
      JSON.stringify({
        channel: "audit",
        id: a.id,
        ts: a.createdAt.toISOString(),
        actorId: a.actorId,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        payload: JSON.parse(a.payloadJson || "{}"),
        ip: a.ip,
      }),
    );
  }

  for (const e of events) {
    console.log(
      JSON.stringify({
        channel: "domain_event",
        id: e.id,
        ts: e.occurredAt.toISOString(),
        type: e.type,
        entityType: e.entityType,
        entityId: e.entityId,
        actorId: e.actorId,
        tenantId: e.tenantId,
        payload: JSON.parse(e.payloadJson || "{}"),
        publishedAt: e.publishedAt?.toISOString() ?? null,
      }),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
