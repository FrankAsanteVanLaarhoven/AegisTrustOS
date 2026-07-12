# Aegis future-proofing

## Philosophy

**Interfaces + config + durable events** beat premature microservices.  
Do not out-build Trulioo. Do not hardcode the next vertical.

## What is in place

| Pillar | Implementation |
|---|---|
| Env validation | `src/config/env.ts` (Zod) |
| Feature flags | `src/config/features.ts` + `FEATURE_FLAGS` |
| Jurisdiction packs | `src/config/jurisdictions/*` (UK live; EU/US stub) |
| Composition root | `src/lib/container.ts` |
| IDV port | `src/lib/idv/provider.ts` — MOCK / TRULIOO / SOCURE stubs |
| Domain outbox | `DomainEventOutbox` + `PrismaOutboxEventBus` |
| Audit + events | `writeAudit({ eventType })` dual-write |
| Trust service | `src/lib/services/trust-service.ts` (human CLEAR invariant) |
| Tenancy headroom | `tenantId` on requests/bookings; `lib/tenancy.ts` |
| API v1 | `/api/v1/health`, `/version`, `/categories`, `/me`, `/events/outbox` |
| Structured logs | `src/lib/observability/logger.ts` |
| Extension guide | `docs/EXTENSIONS.md` |
| ADRs | `docs/ADR/*` |

## Invariants (do not break)

1. **Human clearance only** for `VERIFIED`  
2. **AI advisory only** — no auto-clear  
3. **Hybrid IDV** — vendors are adapters  

## Postgres cutover

1. Set `DATABASE_URL=postgresql://aegis:aegis@localhost:5433/aegis`  
2. Change Prisma `provider` to `postgresql`  
3. `docker compose up -d`  
4. `npx prisma migrate dev --name init` (prefer migrate over push in prod)  
5. `npm run db:seed`  

SQLite remains the zero-deps local default.

## Multi-instance

Replace in-memory rate limits (`RATE_LIMIT_BACKEND=redis` + `REDIS_URL`) before horizontal scale. Outbox publisher worker is next for webhooks.

## Health

```bash
curl -s http://localhost:3010/api/v1/health | jq
curl -s http://localhost:3010/api/v1/version | jq
```
