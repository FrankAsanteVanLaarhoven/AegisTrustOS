# Extending Aegis

## Add a service category (vertical)

1. Append to `CATEGORY_SEEDS` in `src/lib/compliance/matrix.ts`  
2. Set `mode: "WAITLIST"` until ops-ready, then `"ACTIVE"`  
3. Seed: `npm run db:seed` (or upsert migration)  
4. Matching/bookings work automatically for ACTIVE categories  

Optional: gate with feature flag in `src/config/features.ts`.

## Add an IDV vendor

1. Implement `IdvProvider` in `src/lib/idv/provider.ts` (or `adapters/idv/`)  
2. Branch in `getIdvProvider()` on `IDV_VENDOR`  
3. Map vendor payload → `IdvCheck` fields  
4. **Never** set provider VERIFIED from IDV alone — OPS still CLEARs  

## Add a jurisdiction

1. Create pack under `src/config/jurisdictions/`  
2. Register in `jurisdictions/index.ts`  
3. Enable `multiJurisdiction` feature flag when UI is ready  
4. Override checklists via `getChecklist(slug, base)`  

## Emit a new domain event

1. Add type to `DomainEventType` in `src/lib/ports/events.ts`  
2. Call `writeAudit({ ..., eventType: "..." })` or `getContainer().events.publish`  
3. Future webhook worker drains `DomainEventOutbox` where `publishedAt IS NULL`  

## Add partner-scoped (tenant) data

1. Set `tenantId` = `PartnerOrg.id` on `ServiceRequest` / `Booking`  
2. Use `assertPartnerAccess(userId, partnerOrgId)` before read/write  
3. Postgres RLS can later enforce the same column  

## Application service vs server action

- **Service** (`src/lib/services/*`): pure domain, reusable from API/UI  
- **Server action**: auth + form parse + revalidate + redirect  

Prefer moving logic into services as API v1 grows.
