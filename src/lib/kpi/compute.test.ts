import { describe, expect, it } from "vitest";
import { computeKpis } from "./compute";

describe("computeKpis", () => {
  it("computes booking success and incident rate", () => {
    const kpis = computeKpis({
      vettingDurationsHours: [10, 20, 30],
      totalNonDraftRequests: 10,
      completedBookings: 8,
      totalBookings: 10,
      clientsWithBookings: 5,
      clientsWithRepeatBookings: 3,
      incidentCount: 0,
      reviewRatings: [5, 5, 4],
      flaggedSubmits: 2,
      totalSubmits: 10,
      verifiedProviders: 4,
      activeProvidersLast90d: 3,
    });
    const success = kpis.find((k) => k.key === "booking_success");
    expect(success?.value).toBe(80);
    expect(success?.onTrack).toBe(true);
    const incidents = kpis.find((k) => k.key === "incident_rate");
    expect(incidents?.value).toBe(0);
  });
});
