import { db } from "@/lib/db";

export type MemberRatingSummary = {
  count: number;
  average: number | null;
  reliability: number | null;
  professionalism: number | null;
  communication: number | null;
  recent: {
    rating: number;
    body: string | null;
    createdAt: Date;
    authorName: string;
  }[];
};

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** Ratings left *about* a provider (clients → provider). */
export async function getProviderRatingSummary(
  providerId: string,
): Promise<MemberRatingSummary> {
  const reviews = await db.review.findMany({
    where: {
      direction: "CLIENT_TO_PROVIDER",
      visibility: "PUBLIC",
      booking: { providerId },
    },
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    count: reviews.length,
    average: avg(reviews.map((r) => r.rating)),
    reliability: avg(
      reviews.map((r) => r.reliability).filter((n): n is number => n != null),
    ),
    professionalism: avg(
      reviews
        .map((r) => r.professionalism)
        .filter((n): n is number => n != null),
    ),
    communication: avg(
      reviews.map((r) => r.communication).filter((n): n is number => n != null),
    ),
    recent: reviews.slice(0, 5).map((r) => ({
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      authorName: r.createdBy.name,
    })),
  };
}

/** Ratings left *about* a client (providers → client). */
export async function getClientRatingSummary(
  clientId: string,
): Promise<MemberRatingSummary> {
  const reviews = await db.review.findMany({
    where: {
      direction: "PROVIDER_TO_CLIENT",
      visibility: "PUBLIC",
      booking: { clientId },
    },
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    count: reviews.length,
    average: avg(reviews.map((r) => r.rating)),
    reliability: avg(
      reviews.map((r) => r.reliability).filter((n): n is number => n != null),
    ),
    professionalism: avg(
      reviews
        .map((r) => r.professionalism)
        .filter((n): n is number => n != null),
    ),
    communication: avg(
      reviews.map((r) => r.communication).filter((n): n is number => n != null),
    ),
    recent: reviews.slice(0, 5).map((r) => ({
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      authorName: r.createdBy.name,
    })),
  };
}

export async function getProviderRatingMap(
  providerIds: string[],
): Promise<Map<string, { average: number; count: number }>> {
  const map = new Map<string, { average: number; count: number }>();
  if (!providerIds.length) return map;

  const reviews = await db.review.findMany({
    where: {
      direction: "CLIENT_TO_PROVIDER",
      visibility: "PUBLIC",
      booking: { providerId: { in: providerIds } },
    },
    select: {
      rating: true,
      booking: { select: { providerId: true } },
    },
  });

  const buckets = new Map<string, number[]>();
  for (const r of reviews) {
    const pid = r.booking.providerId;
    const arr = buckets.get(pid) ?? [];
    arr.push(r.rating);
    buckets.set(pid, arr);
  }
  for (const [pid, ratings] of buckets) {
    map.set(pid, {
      count: ratings.length,
      average: avg(ratings) ?? 0,
    });
  }
  return map;
}
