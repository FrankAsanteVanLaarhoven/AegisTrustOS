/**
 * Drain domain event outbox — mark published; optionally POST to WEBHOOK_URL.
 * Usage: npx tsx scripts/drain-outbox.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const webhook = process.env.DOMAIN_EVENT_WEBHOOK_URL;
  const rows = await db.domainEventOutbox.findMany({
    where: { publishedAt: null },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  console.log(`Found ${rows.length} unpublished events`);
  const published: string[] = [];

  for (const row of rows) {
    if (webhook) {
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: row.id,
            type: row.type,
            entityType: row.entityType,
            entityId: row.entityId,
            actorId: row.actorId,
            tenantId: row.tenantId,
            payload: JSON.parse(row.payloadJson || "{}"),
            occurredAt: row.occurredAt,
          }),
        });
        if (!res.ok) {
          console.error(`Webhook failed for ${row.id}: ${res.status}`);
          continue;
        }
      } catch (e) {
        console.error(`Webhook error for ${row.id}`, e);
        continue;
      }
    }
    published.push(row.id);
  }

  if (published.length) {
    await db.domainEventOutbox.updateMany({
      where: { id: { in: published } },
      data: { publishedAt: new Date() },
    });
  }

  console.log(JSON.stringify({ published: published.length, webhook: Boolean(webhook) }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
