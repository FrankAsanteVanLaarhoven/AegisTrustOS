import { describe, expect, it } from "vitest";
import { rankMatches, type MatchCandidate } from "./engine";

const base: MatchCandidate = {
  providerId: "p1",
  name: "Sam",
  city: "London",
  lat: 51.5,
  lng: -0.12,
  serviceRadiusKm: 25,
  skills: ["calendar", "travel"],
  riskScore: 20,
  trustTier: "T2",
  categoryStatus: "VERIFIED",
  categorySlug: "personal-assistant",
  reviewAvg: 5,
  priorBookingsWithClient: 1,
};

describe("rankMatches", () => {
  it("excludes non-verified providers", () => {
    const ranked = rankMatches(
      {
        categorySlug: "personal-assistant",
        location: "London",
        minTrustTier: "T1",
        skills: ["calendar"],
      },
      [{ ...base, categoryStatus: "SUBMITTED" }],
    );
    expect(ranked).toHaveLength(0);
  });

  it("ranks verified providers with reasons", () => {
    const ranked = rankMatches(
      {
        categorySlug: "personal-assistant",
        location: "London",
        minTrustTier: "T1",
        skills: ["calendar", "travel"],
        lat: 51.5074,
        lng: -0.1278,
      },
      [base, { ...base, providerId: "p2", name: "Other", riskScore: 80, priorBookingsWithClient: 0 }],
    );
    expect(ranked.length).toBe(2);
    expect(ranked[0].reasons.length).toBeGreaterThan(0);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it("enforces min trust tier", () => {
    const ranked = rankMatches(
      {
        categorySlug: "personal-assistant",
        location: "London",
        minTrustTier: "T3",
        skills: [],
      },
      [{ ...base, trustTier: "T1" }],
    );
    expect(ranked).toHaveLength(0);
  });
});
