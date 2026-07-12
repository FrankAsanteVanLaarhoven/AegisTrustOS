import type { TrustDecision, TrustTier } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { getContainer } from "@/lib/container";
import { log } from "@/lib/observability/logger";

/**
 * Application service — human clearance invariant lives here.
 * CRITICAL categories require dual control (two distinct OPS reviewers).
 */
export async function recordTrustDecision(input: {
  providerId: string;
  reviewerId: string;
  decision: TrustDecision;
  rationale: string;
  categorySlug?: string | null;
  trustTier?: TrustTier;
}) {
  const {
    providerId,
    reviewerId,
    decision,
    rationale,
    categorySlug = null,
    trustTier = "T1",
  } = input;

  if (!rationale.trim()) {
    throw new Error("Rationale required");
  }

  const provider = await db.providerProfile.findUnique({
    where: { id: providerId },
    include: {
      categories: { include: { category: true } },
    },
  });
  if (!provider) throw new Error("Provider not found");

  const targetCats = categorySlug
    ? provider.categories.filter((c) => c.category.slug === categorySlug)
    : provider.categories.filter((c) =>
        ["SUBMITTED", "IN_REVIEW"].includes(c.status),
      );

  const isCritical = targetCats.some((c) => c.category.riskLevel === "CRITICAL");

  // Dual control: first CLEAR on CRITICAL only records vote; second distinct reviewer finalizes
  if (decision === "CLEAR" && isCritical) {
    const prior = await db.trustReview.findMany({
      where: {
        providerId,
        decision: "CLEAR",
        ...(categorySlug ? { categorySlug } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const otherReviewerClear = prior.some((r) => r.reviewerId !== reviewerId);
    if (!otherReviewerClear) {
      const review = await db.trustReview.create({
        data: {
          providerId,
          reviewerId,
          decision: "CLEAR",
          rationale: `[DUAL_CONTROL_1/2] ${rationale}`,
          categorySlug,
          checklistSnapshotJson: JSON.stringify(
            provider.categories.map((c) => ({
              slug: c.category.slug,
              status: c.status,
            })),
          ),
          aiSignalsJson: JSON.stringify({
            riskScore: provider.riskScore,
            dualControl: "pending_second_reviewer",
          }),
        },
      });

      for (const cat of targetCats) {
        await db.providerCategory.update({
          where: { id: cat.id },
          data: { status: "IN_REVIEW", notes: "Dual-control: awaiting second CLEAR" },
        });
      }

      await writeAudit({
        actorId: reviewerId,
        entityType: "TrustReview",
        entityId: review.id,
        action: "TRUST_CLEAR_DUAL_CONTROL_PENDING",
        payload: { providerId, categorySlug, trustTier },
        eventType: "trust.decision",
      });

      // Notify other OPS
      const others = await db.user.findMany({
        where: {
          role: { in: ["OPS", "ADMIN"] },
          id: { not: reviewerId },
        },
      });
      const { notify } = getContainer();
      for (const o of others) {
        await notify
          .send({
            channel: "email",
            to: o.email,
            subject: "Aegis — dual-control clearance needed",
            body: `Provider ${providerId} has a first CLEAR vote for CRITICAL category ${categorySlug ?? "(batch)"}. A second distinct reviewer must CLEAR.`,
            templateKey: "trust.dual_control",
          })
          .catch(() => undefined);
      }

      log.info("trust_dual_control_pending", { providerId, reviewerId, categorySlug });
      return { review, dualControlPending: true as const };
    }
  }

  const review = await db.trustReview.create({
    data: {
      providerId,
      reviewerId,
      decision,
      rationale:
        decision === "CLEAR" && isCritical
          ? `[DUAL_CONTROL_2/2] ${rationale}`
          : rationale,
      categorySlug,
      checklistSnapshotJson: JSON.stringify(
        provider.categories.map((c) => ({
          slug: c.category.slug,
          status: c.status,
        })),
      ),
      aiSignalsJson: JSON.stringify({ riskScore: provider.riskScore }),
    },
  });

  if (decision === "CLEAR") {
    if (categorySlug) {
      const cat = provider.categories.find((c) => c.category.slug === categorySlug);
      if (cat) {
        await db.providerCategory.update({
          where: { id: cat.id },
          data: {
            status: "VERIFIED",
            trustTier,
            verifiedAt: new Date(),
            notes: null,
          },
        });
      }
    } else {
      await db.providerCategory.updateMany({
        where: {
          providerId,
          status: { in: ["SUBMITTED", "IN_REVIEW"] },
        },
        data: { status: "VERIFIED", trustTier, verifiedAt: new Date() },
      });
    }
    await db.providerProfile.update({
      where: { id: providerId },
      data: {
        overallStatus: "VERIFIED",
        lastReviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });
    await db.credential.updateMany({
      where: {
        providerId,
        verificationStatus: { in: ["PENDING", "AI_FLAGGED"] },
      },
      data: { verificationStatus: "VERIFIED" },
    });
  } else if (decision === "REJECT") {
    await db.providerProfile.update({
      where: { id: providerId },
      data: {
        overallStatus: "SUSPENDED",
        lastReviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });
    if (categorySlug) {
      const cat = provider.categories.find((c) => c.category.slug === categorySlug);
      if (cat) {
        await db.providerCategory.update({
          where: { id: cat.id },
          data: { status: "REJECTED" },
        });
      }
    }
  } else if (decision === "REQUEST_MORE") {
    await db.providerProfile.update({
      where: { id: providerId },
      data: {
        overallStatus: "SUBMITTED",
        lastReviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });
  } else if (decision === "WAITLIST") {
    if (categorySlug) {
      const cat = provider.categories.find((c) => c.category.slug === categorySlug);
      if (cat) {
        await db.providerCategory.update({
          where: { id: cat.id },
          data: { status: "WAITLIST" },
        });
      }
    }
  }

  await writeAudit({
    actorId: reviewerId,
    entityType: "TrustReview",
    entityId: review.id,
    action: `TRUST_${decision}`,
    payload: { providerId, categorySlug, trustTier, rationale },
    eventType: decision === "CLEAR" ? "trust.cleared" : "trust.decision",
  });

  if (decision === "CLEAR") {
    const { issueOrRefreshPassport } = await import(
      "@/lib/services/passport-service"
    );
    await issueOrRefreshPassport(providerId, reviewerId);
    const providerUser = await db.providerProfile.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });
    if (providerUser) {
      const { notifyTrustCleared } = await import(
        "@/lib/services/notify-service"
      );
      await notifyTrustCleared(providerUser.userId, categorySlug).catch(
        () => undefined,
      );
    }
  } else if (decision === "REJECT") {
    const { revokePassport } = await import("@/lib/services/passport-service");
    await revokePassport(providerId, reviewerId);
  }

  log.info("trust_decision_recorded", {
    decision,
    providerId,
    reviewerId,
    categorySlug: categorySlug ?? undefined,
    critical: isCritical,
  });
  void getContainer();

  return { review, dualControlPending: false as const };
}
