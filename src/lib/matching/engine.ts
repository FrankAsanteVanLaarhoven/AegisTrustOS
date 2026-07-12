import type { TrustTier } from "@prisma/client";

export type MatchCandidate = {
  providerId: string;
  name: string;
  city: string;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  serviceRadiusKm: number;
  skills: string[];
  riskScore: number;
  trustTier: TrustTier;
  categoryStatus: string;
  categorySlug: string;
  reviewAvg?: number | null;
  priorBookingsWithClient?: number;
  suspended?: boolean;
};

export type MatchRequest = {
  categorySlug: string;
  location: string;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  minTrustTier: TrustTier;
  skills: string[];
  clientId?: string;
};

export type RankedMatch = {
  providerId: string;
  name: string;
  score: number;
  reasons: string[];
  trustTier: TrustTier;
  city: string;
  riskScore: number;
};

const TIER_RANK: Record<TrustTier, number> = { T1: 1, T2: 2, T3: 3 };

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** London approx centre for demo geo */
export const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };

export function rankMatches(
  request: MatchRequest,
  candidates: MatchCandidate[],
  limit = 10,
): RankedMatch[] {
  const reqTier = TIER_RANK[request.minTrustTier];
  const reqSkills = new Set(request.skills.map((s) => s.toLowerCase()));
  const reqPoint =
    request.lat != null && request.lng != null
      ? { lat: request.lat, lng: request.lng }
      : LONDON_CENTER;

  const ranked: RankedMatch[] = [];

  for (const c of candidates) {
    const reasons: string[] = [];
    if (c.suspended) continue;
    if (c.categoryStatus !== "VERIFIED") continue;
    if (c.categorySlug !== request.categorySlug) continue;
    if (TIER_RANK[c.trustTier] < reqTier) continue;

    // Soft geo: prefer same city / within radius when coords exist
    let distanceKm: number | null = null;
    if (c.lat != null && c.lng != null) {
      distanceKm = haversineKm(reqPoint, { lat: c.lat, lng: c.lng });
      if (distanceKm > c.serviceRadiusKm + 5) continue;
      reasons.push(`Within ~${Math.round(distanceKm)}km service radius`);
    } else if (
      c.city.toLowerCase() === request.location.toLowerCase() ||
      request.location.toLowerCase().includes(c.city.toLowerCase())
    ) {
      reasons.push(`Based in ${c.city}`);
    } else {
      // allow cross-city but lower score
      reasons.push(`Location soft-match (${c.city})`);
    }

    let score = 50;
    score += TIER_RANK[c.trustTier] * 8;
    reasons.push(`Trust tier ${c.trustTier}`);

    // lower risk better
    score += Math.max(0, 30 - c.riskScore * 0.25);
    reasons.push(`Advisory risk score ${c.riskScore}/100 (lower is better)`);

    const skillOverlap = c.skills.filter((s) => reqSkills.has(s.toLowerCase()));
    if (skillOverlap.length) {
      score += skillOverlap.length * 6;
      reasons.push(`Skills: ${skillOverlap.join(", ")}`);
    }

    if (c.reviewAvg != null) {
      score += c.reviewAvg * 4;
      reasons.push(`Review avg ${c.reviewAvg.toFixed(1)}/5`);
    }

    if ((c.priorBookingsWithClient ?? 0) > 0) {
      score += 12;
      reasons.push(`Prior continuity (${c.priorBookingsWithClient} booking(s))`);
    }

    if (distanceKm != null) {
      score += Math.max(0, 15 - distanceKm * 0.4);
    }

    ranked.push({
      providerId: c.providerId,
      name: c.name,
      score: Math.round(score * 10) / 10,
      reasons,
      trustTier: c.trustTier,
      city: c.city,
      riskScore: c.riskScore,
    });
  }

  return ranked.sort((a, b) => b.score - a.score).slice(0, limit);
}
