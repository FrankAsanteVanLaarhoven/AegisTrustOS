# Hybrid IDV architecture

## Principle

Aegis is the **vertical trust and orchestration layer**. Horizontal IDV vendors are **pluggable infrastructure**.

```
┌─────────────────────────────────────────────────────────────┐
│  Aegis orchestration                                         │
│  requests · match · NDA/contracts · bookings · logs · KPIs   │
├─────────────────────────────────────────────────────────────┤
│  Aegis Trust & Safety                                        │
│  category matrices · evidence packs · human CLEAR · incidents│
├─────────────────────────────────────────────────────────────┤
│  Aegis identity wallet                                       │
│  credentials · references · advisory AI · audit events       │
├─────────────────────────────────────────────────────────────┤
│  IdvProvider adapter                                         │
│  MockIdvProvider | TruliooAdapter | SocureAdapter | …        │
└─────────────────────────────────────────────────────────────┘
```

## Code map

| Concern | Location |
|---|---|
| Adapter interface | `src/lib/idv/provider.ts` |
| Mock implementation | `MockIdvProvider` |
| Vendor enum in DB | `IdvCheck.vendor` |
| Clearance (human only) | `trustDecision` in `src/lib/actions.ts` |
| AI advisory only | `src/lib/ai/assist.ts` |
| Compliance matrix | `src/lib/compliance/matrix.ts` |

## Data flow — provider clearance

1. Provider registers → `ProviderProfile`  
2. Uploads credentials → `Credential` wallet  
3. `IdvProvider.startCheck` / `getResult` → `IdvCheck` row  
4. Apply to category → checklist evaluate + AI `buildAssessment` stored on `ProviderCategory`  
5. OPS opens evidence pack → records `TrustReview` with rationale  
6. Only on `CLEAR` → category `VERIFIED` + optional credential bulk verify  
7. Provider becomes eligible for `rankMatches`  

**Hard rule:** no code path sets `VERIFIED` without human `TrustReview`.

## Production vendor swap (future)

```ts
// conceptual
function getIdvProvider(): IdvProvider {
  switch (process.env.IDV_VENDOR) {
    case "trulioo": return new TruliooAdapter(process.env.TRULIOO_KEY!);
    case "socure": return new SocureAdapter(process.env.SOCURE_KEY!);
    default: return new MockIdvProvider();
  }
}
```

Map vendor response → Aegis:

| Vendor field | Aegis field |
|---|---|
| session / transaction id | `IdvCheck.externalRef` |
| document + liveness pass | `IdvCheck.status` |
| liveness score | `IdvCheck.livenessScore` |
| raw payload | `IdvCheck.rawResultJson` |
| fraud / risk signals | fold into AI advisory JSON (never auto-CLEAR) |

## Why hybrid

| Build ourselves | Buy / partner |
|---|---|
| Role risk, matrices, ops, match, contracts | Global docs, liveness, device fraud |
| UK vertical evidence workflows | Multi-jurisdiction KYC scale |
| Agency hybrid UX | SOC2 IDV pipe certifications |

Attempting full horizontal parity burns capital on data contracts and fraud R&D that do not differentiate Aegis in concierge/security/care.

## Security & compliance notes

- Minimise PII retention; prefer vendor-hosted document images where possible  
- Audit every CLEAR / REJECT  
- DPIA before production UK personal data processing  
- Legal review before claiming regulated checks  
