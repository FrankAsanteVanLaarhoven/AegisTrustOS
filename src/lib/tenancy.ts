import { db } from "@/lib/db";

/**
 * Multi-tenant readiness helpers.
 * PartnerOrg is the tenant root; full RLS is a future Postgres step.
 */
export async function getUserPartnerMemberships(userId: string) {
  return db.partnerMembership.findMany({
    where: { userId },
    include: { partnerOrg: true },
  });
}

export async function assertPartnerAccess(
  userId: string,
  partnerOrgId: string,
): Promise<boolean> {
  const m = await db.partnerMembership.findUnique({
    where: {
      partnerOrgId_userId: { partnerOrgId, userId },
    },
  });
  return Boolean(m);
}

export async function resolveDefaultTenantId(userId: string): Promise<string | null> {
  const m = await db.partnerMembership.findFirst({
    where: { userId },
    orderBy: { role: "asc" },
  });
  return m?.partnerOrgId ?? null;
}
