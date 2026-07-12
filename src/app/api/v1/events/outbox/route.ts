import { auth } from "@/lib/auth";
import { listUnpublishedOutbox } from "@/lib/adapters/events/prisma-outbox";
import { apiOk, apiErr } from "@/lib/api/envelope";
import { isFeatureEnabled } from "@/config/features";

export const dynamic = "force-dynamic";

/** OPS/ADMIN peek at unpublished domain events (future webhook worker). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return apiErr("UNAUTHORIZED");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    return apiErr("FORBIDDEN");
  }
  if (!isFeatureEnabled("webhooks") && process.env.NODE_ENV === "production") {
    // Still allow read in dev; gate publish path only — list is ops tooling
  }

  const rows = await listUnpublishedOutbox(50);
  return apiOk({
    count: rows.length,
    events: rows.map((r) => ({
      id: r.id,
      type: r.type,
      entityType: r.entityType,
      entityId: r.entityId,
      tenantId: r.tenantId,
      occurredAt: r.occurredAt,
      createdAt: r.createdAt,
    })),
  });
}
