import { db } from "@/lib/db";
import { computeKpis } from "@/lib/kpi/compute";

export async function loadKpis() {
  const [
    trustReviews,
    providerCategories,
    requests,
    bookings,
    incidents,
    reviews,
    credentials,
    verifiedProviders,
  ] = await Promise.all([
    db.trustReview.findMany({
      select: { providerId: true, createdAt: true, decision: true },
    }),
    db.providerCategory.findMany({
      select: {
        providerId: true,
        submittedAt: true,
        verifiedAt: true,
        status: true,
        aiSignalsJson: true,
      },
    }),
    db.serviceRequest.findMany({ select: { id: true, status: true, clientId: true } }),
    db.booking.findMany({
      select: {
        id: true,
        status: true,
        providerId: true,
        clientId: true,
        scheduledStart: true,
      },
    }),
    db.incident.findMany({ select: { id: true } }),
    db.review.findMany({ select: { rating: true } }),
    db.credential.findMany({ select: { verificationStatus: true } }),
    db.providerProfile.findMany({
      where: { overallStatus: "VERIFIED" },
      select: { id: true },
    }),
  ]);

  const submitMap = new Map<string, Date>();
  for (const pc of providerCategories) {
    if (pc.submittedAt) {
      const prev = submitMap.get(pc.providerId);
      if (!prev || pc.submittedAt < prev) submitMap.set(pc.providerId, pc.submittedAt);
    }
  }

  const vettingDurationsHours: number[] = [];
  for (const tr of trustReviews) {
    if (tr.decision !== "CLEAR") continue;
    const submitted = submitMap.get(tr.providerId);
    if (!submitted) continue;
    const hours = (tr.createdAt.getTime() - submitted.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) vettingDurationsHours.push(hours);
  }

  const nonDraft = requests.filter((r) => r.status !== "DRAFT");
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED").length;

  const byClient = new Map<string, number>();
  for (const b of bookings) {
    if (b.status === "CANCELLED") continue;
    byClient.set(b.clientId, (byClient.get(b.clientId) ?? 0) + 1);
  }
  const clientsWithBookings = byClient.size;
  const clientsWithRepeatBookings = [...byClient.values()].filter((n) => n >= 2).length;

  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const activeProviderIds = new Set(
    bookings
      .filter((b) => b.scheduledStart.getTime() >= cutoff)
      .map((b) => b.providerId),
  );
  const verifiedIds = new Set(verifiedProviders.map((p) => p.id));
  const activeProvidersLast90d = [...activeProviderIds].filter((id) =>
    verifiedIds.has(id),
  ).length;

  let flaggedSubmits = 0;
  let totalSubmits = 0;
  for (const pc of providerCategories) {
    if (!pc.submittedAt) continue;
    totalSubmits += 1;
    try {
      const signals = JSON.parse(pc.aiSignalsJson || "{}") as {
        signals?: { severity?: string }[];
      };
      if ((signals.signals ?? []).some((s) => s.severity === "high" || s.severity === "warn")) {
        flaggedSubmits += 1;
      }
    } catch {
      /* ignore */
    }
  }

  // also count AI_FLAGGED credentials as escalation signal
  const flaggedCreds = credentials.filter((c) => c.verificationStatus === "AI_FLAGGED").length;

  return computeKpis({
    vettingDurationsHours,
    totalNonDraftRequests: nonDraft.length,
    completedBookings,
    totalBookings: bookings.length,
    clientsWithBookings,
    clientsWithRepeatBookings,
    incidentCount: incidents.length,
    reviewRatings: reviews.map((r) => r.rating),
    flaggedSubmits: flaggedSubmits + flaggedCreds,
    totalSubmits: Math.max(totalSubmits, 1),
    verifiedProviders: verifiedProviders.length,
    activeProvidersLast90d,
  });
}
