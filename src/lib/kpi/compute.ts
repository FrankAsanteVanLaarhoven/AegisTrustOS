import { median } from "@/lib/utils";

export type KpiInput = {
  vettingDurationsHours: number[];
  totalNonDraftRequests: number;
  completedBookings: number;
  totalBookings: number;
  clientsWithBookings: number;
  clientsWithRepeatBookings: number;
  incidentCount: number;
  reviewRatings: number[]; // 1-5
  flaggedSubmits: number;
  totalSubmits: number;
  verifiedProviders: number;
  activeProvidersLast90d: number;
};

export type KpiResult = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  target: string;
  onTrack: boolean | null;
  detail?: string;
};

export function computeKpis(input: KpiInput): KpiResult[] {
  const medVet = median(input.vettingDurationsHours);
  const bookingSuccess =
    input.totalNonDraftRequests > 0
      ? (input.completedBookings / input.totalNonDraftRequests) * 100
      : null;
  const repeatRate =
    input.clientsWithBookings > 0
      ? (input.clientsWithRepeatBookings / input.clientsWithBookings) * 100
      : null;
  const incidentRate =
    input.totalBookings > 0
      ? (input.incidentCount / input.totalBookings) * 1000
      : null;
  const npsProxy =
    input.reviewRatings.length > 0
      ? (input.reviewRatings.reduce((a, b) => a + b, 0) / input.reviewRatings.length) * 2
      : null; // map 1-5 → ~2-10
  const escalationRate =
    input.totalSubmits > 0 ? (input.flaggedSubmits / input.totalSubmits) * 100 : null;
  const retention =
    input.verifiedProviders > 0
      ? (input.activeProvidersLast90d / input.verifiedProviders) * 100
      : null;

  return [
    {
      key: "vetting_median_h",
      label: "Median vetting time",
      value: medVet != null ? Math.round(medVet * 10) / 10 : null,
      unit: "hours",
      target: "< 48h",
      onTrack: medVet == null ? null : medVet < 48,
    },
    {
      key: "booking_success",
      label: "Booking success rate",
      value: bookingSuccess != null ? Math.round(bookingSuccess * 10) / 10 : null,
      unit: "%",
      target: "> 70%",
      onTrack: bookingSuccess == null ? null : bookingSuccess > 70,
    },
    {
      key: "repeat_engagement",
      label: "Repeat engagement (proxy)",
      value: repeatRate != null ? Math.round(repeatRate * 10) / 10 : null,
      unit: "%",
      target: "> 50%",
      onTrack: repeatRate == null ? null : repeatRate > 50,
    },
    {
      key: "incident_rate",
      label: "Incident rate",
      value: incidentRate != null ? Math.round(incidentRate * 100) / 100 : null,
      unit: "per 1k bookings",
      target: "< 1 / 1,000",
      onTrack: incidentRate == null ? null : incidentRate < 1,
    },
    {
      key: "nps_proxy",
      label: "NPS proxy (from reviews)",
      value: npsProxy != null ? Math.round(npsProxy * 10) / 10 : null,
      unit: "0–10 scale",
      target: "> 7.0 (~NPS 70 proxy)",
      onTrack: npsProxy == null ? null : npsProxy > 7,
    },
    {
      key: "escalation_rate",
      label: "AI-flagged submit rate",
      value: escalationRate != null ? Math.round(escalationRate * 10) / 10 : null,
      unit: "%",
      target: "Track (pilot)",
      onTrack: null,
      detail: "Share of submissions with AI flags — not auto-rejects",
    },
    {
      key: "provider_retention",
      label: "Provider retention proxy",
      value: retention != null ? Math.round(retention * 10) / 10 : null,
      unit: "%",
      target: "Track (pilot)",
      onTrack: null,
      detail: "Verified providers with a booking in last 90 days",
    },
  ];
}
