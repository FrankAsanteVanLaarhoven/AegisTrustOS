# KPI framework

Computed live in `/ops/kpis` from DB events.

| KPI | Formula | Pilot target |
|---|---|---|
| Median vetting time | hours between first category submit and CLEAR TrustReview | < 48h |
| Booking success rate | COMPLETED bookings / non-draft requests | > 70% |
| Repeat engagement | clients with ≥2 bookings / clients with ≥1 | > 50% |
| Incident rate | incidents / bookings × 1000 | < 1 / 1k |
| NPS proxy | mean star rating × 2 | > 7.0 |
| AI-flagged submit rate | submits with warn/high signals / submits | track |
| Provider retention proxy | verified with booking in 90d / verified | track |

No fake telemetry.
