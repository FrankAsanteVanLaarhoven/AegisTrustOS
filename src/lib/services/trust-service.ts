import type { TrustDecision, TrustTier } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { getContainer } from "@/lib/container";
import { log } from "@/lib/observability/logger";

/**
 * Application service — human clearance invariant lives here.
 * UI actions and API v1 both call this (future).
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

  const review = await db.trustReview.create({
    data: {
      providerId,
      reviewerId,
      decision,
      rationale,
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
  } else if (decision === "REJECT") {
    const { revokePassport } = await import("@/lib/services/passport-service");
    await revokePassport(providerId, reviewerId);
  }

  log.info("trust_decision_recorded", {
    decision,
    providerId,
    reviewerId,
    categorySlug: categorySlug ?? undefined,
  });
  void getContainer();

  return review;
}
