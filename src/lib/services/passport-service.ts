import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { TrustTier } from "@prisma/client";

const TIER_RANK: Record<TrustTier, number> = { T1: 1, T2: 2, T3: 3 };

function pickHighestTier(tiers: TrustTier[]): TrustTier {
  if (!tiers.length) return "T1";
  return tiers.reduce((a, b) => (TIER_RANK[b] > TIER_RANK[a] ? b : a), "T1");
}

/** Issue or refresh Aegis Passport after human clearance. Not a government ID. */
export async function issueOrRefreshPassport(
  providerId: string,
  actorId?: string,
) {
  const verified = await db.providerCategory.findMany({
    where: { providerId, status: "VERIFIED" },
    include: { category: true },
  });
  if (!verified.length) return null;

  const tier = pickHighestTier(verified.map((v) => v.trustTier));
  const categories = verified.map((v) => v.category.slug);
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const existing = await db.aegisPassport.findUnique({ where: { providerId } });
  const passportNumber =
    existing?.passportNumber ??
    `AGS-UK-${nanoid(8).toUpperCase().replace(/[_-]/g, "")}`;
  const publicSlug = existing?.publicSlug ?? nanoid(12);

  const passport = await db.aegisPassport.upsert({
    where: { providerId },
    create: {
      providerId,
      passportNumber,
      publicSlug,
      status: "ACTIVE",
      tier,
      verifiedCategoriesJson: JSON.stringify(categories),
      expiresAt,
    },
    update: {
      status: "ACTIVE",
      tier,
      verifiedCategoriesJson: JSON.stringify(categories),
      expiresAt,
      revokedAt: null,
    },
  });

  await writeAudit({
    actorId,
    entityType: "AegisPassport",
    entityId: passport.id,
    action: existing ? "PASSPORT_REFRESH" : "PASSPORT_ISSUE",
    payload: { passportNumber, tier, categories },
  });

  return passport;
}

export async function revokePassport(providerId: string, actorId?: string) {
  const p = await db.aegisPassport.findUnique({ where: { providerId } });
  if (!p) return null;
  const updated = await db.aegisPassport.update({
    where: { providerId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await writeAudit({
    actorId,
    entityType: "AegisPassport",
    entityId: p.id,
    action: "PASSPORT_REVOKE",
  });
  return updated;
}
