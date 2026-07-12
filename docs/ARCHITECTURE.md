# Aegis architecture

## Brand posture
**Aegis Trust OS** — vertical trust + orchestration for high-stakes human services.  
Hybrid IDV: vendors for base KYC; Aegis for role risk, compliance packs, human clearance, placements.

## Layers

```
Service orchestration  →  requests, match, contracts, bookings, logs, reviews
Category compliance    →  matrices, gates, incidents, playbook, partners
Identity & trust       →  IdvProvider adapter, wallet, AI advisory, audit
```

## Stack
- Next.js App Router (TypeScript)
- SQLite via Prisma for local demo (Postgres-ready / docker-compose)
- Auth.js credentials sessions (CLIENT | PROVIDER | OPS | ADMIN)
- Server actions for mutations; audit on sensitive events

## Data flows

### Provider clearance
Register → profile → credentials → IDV adapter → category apply → AI assessment stored → OPS TrustReview → VERIFIED badge → match-eligible

### Client booking
Request (active category) → rankMatches → shortlist → NDA+SERVICE e-sign (simulated) → Booking → logs → review → KPIs

## AI touchpoints
`src/lib/ai/assist.ts` — extract hints, missing checklist, inconsistency flags, advisory risk, triage priority. **Never sets VERIFIED.**

## IDV adapter
`src/lib/idv/provider.ts` — `IdvProvider` interface; `MockIdvProvider` default. Production swap: Trulioo/Socure without rewriting domain logic. See `docs/HYBRID_IDV_ARCHITECTURE.md`.

## Matching
`src/lib/matching/engine.ts` — deterministic, unit-tested, explainable `reasons[]`.

## Trust & Safety
**Aegis Trust & Safety** ops: queues, playbook, incidents, KPIs, audit. CLEAR requires human rationale.

## Vertical activation
`Category.mode`: ACTIVE | WAITLIST | DISABLED. Security/care waitlisted in seed.

## Related docs
- `docs/BRAND.md`
- `docs/COMPETITIVE_MATRIX.md`
- `docs/HYBRID_IDV_ARCHITECTURE.md`
- `docs/DEMAND_VALIDATION.md`
