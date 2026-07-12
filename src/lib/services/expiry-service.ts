import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { notifyExpiringCredential } from "@/lib/services/notify-service";
import { log } from "@/lib/observability/logger";

export type ExpiryReport = {
  expiringSoon: number;
  expired: number;
  notified: number;
  suspendedPassports: number;
};

/** Flag expired credentials and warn on upcoming expiries (default 30 days). */
export async function runCredentialExpirySweep(opts?: {
  warnWithinDays?: number;
  notify?: boolean;
}): Promise<ExpiryReport> {
  const warnWithinDays = opts?.warnWithinDays ?? 30;
  const notify = opts?.notify !== false;
  const now = new Date();
  const horizon = new Date(now.getTime() + warnWithinDays * 24 * 60 * 60 * 1000);

  const expired = await db.credential.findMany({
    where: {
      expiresAt: { lte: now },
      verificationStatus: { not: "EXPIRED" },
    },
    include: { provider: { include: { user: true, passport: true } } },
  });

  for (const c of expired) {
    await db.credential.update({
      where: { id: c.id },
      data: { verificationStatus: "EXPIRED" },
    });
    await writeAudit({
      entityType: "Credential",
      entityId: c.id,
      action: "CREDENTIAL_EXPIRED",
      payload: { providerId: c.providerId, title: c.title },
    });
  }

  const expiringSoon = await db.credential.findMany({
    where: {
      expiresAt: { gt: now, lte: horizon },
      verificationStatus: { in: ["VERIFIED", "PENDING", "AI_FLAGGED"] },
    },
    include: { provider: { include: { user: true } } },
  });

  let notified = 0;
  if (notify) {
    for (const c of expiringSoon) {
      if (!c.expiresAt) continue;
      await notifyExpiringCredential({
        providerUserId: c.provider.userId,
        title: c.title,
        expiresAt: c.expiresAt,
      });
      notified += 1;
    }
  }

  // If a verified provider has critical expired docs, soft-suspend passport
  let suspendedPassports = 0;
  const providersWithExpired = new Set(expired.map((c) => c.providerId));
  for (const providerId of providersWithExpired) {
    const passport = await db.aegisPassport.findUnique({ where: { providerId } });
    if (!passport || passport.status !== "ACTIVE") continue;
    await db.aegisPassport.update({
      where: { providerId },
      data: { status: "SUSPENDED" },
    });
    await writeAudit({
      entityType: "AegisPassport",
      entityId: passport.id,
      action: "PASSPORT_SUSPEND_EXPIRED_CREDS",
      payload: { providerId },
    });
    suspendedPassports += 1;
  }

  const report = {
    expiringSoon: expiringSoon.length,
    expired: expired.length,
    notified,
    suspendedPassports,
  };
  log.info("credential_expiry_sweep", report);
  return report;
}

export async function listExpiringCredentials(withinDays = 90) {
  const now = new Date();
  const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  return db.credential.findMany({
    where: {
      OR: [
        { expiresAt: { lte: now } },
        { expiresAt: { gt: now, lte: horizon } },
      ],
    },
    include: {
      provider: { include: { user: true } },
    },
    orderBy: { expiresAt: "asc" },
    take: 100,
  });
}
