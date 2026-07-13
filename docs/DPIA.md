# DPIA skeleton — Aegis Trust OS

> **Status:** Internal draft · **not** lawyer-reviewed. Complete with counsel before production PII processing under UK GDPR.

## 1. Processing overview

| Item | Summary |
|---|---|
| Controller | Operating entity (TBD legal name) |
| Purpose | Trust infrastructure for high-stakes human services: identity, credentials, matching, bookings, care pathway |
| Lawful bases (draft) | Contract (service delivery); Legitimate interests (fraud/trust & safety); Legal obligation (where applicable); Consent (special categories / care circle where required) |
| Special category | Care pathway may involve health-adjacent data — treat as special category until counsel confirms otherwise |
| Data subjects | Providers (members), clients, care households / family circle, ops staff |

## 2. Data categories

- Identity: name, email, DOB (if captured), photo ID images, selfie/liveness scores  
- Credentials: DBS/SIA/etc metadata, OCR extractions, verification status  
- Operational: bookings, locations, service logs, incidents, ratings  
- Care: household membership, carer approvals, dual-control clearances  
- Payments: Stripe/Connect account ids, payment intent amounts (no full card PAN)  
- Audit: actor, action, entity, IP (where recorded), domain events  

## 3. Storage & security (as-built)

- Evidence store: AES-256-GCM at rest (`STORAGE_BACKEND=local_encrypted` or S3)  
- Auth: Auth.js sessions; production requires strong `AUTH_SECRET`  
- Human CLEAR only — AI/OCR advisory; dual-control for CRITICAL categories  
- Incident freeze can suspend passport  
- Credential expiry sweep  
- Stealth security headers / rate limits  

## 4. Processors / sub-processors (planned)

| Processor | Role | Notes |
|---|---|---|
| Hosting (TBD) | App + DB | Prefer EU/UK region |
| Stripe | Payments + Connect | PCI via Stripe |
| Trulioo / Socure | IDV | Via `IdvProvider` port; webhook callbacks |
| Object storage (S3) | Encrypted evidence | Optional |
| Email/SMS bridge | Notifications | Webhook/SES/Postmark |

## 5. Retention (draft)

| Record | Draft retention |
|---|---|
| Audit events | `AUDIT_RETENTION_DAYS` (default 2555 ≈ 7y) |
| IDV images | Until credential superseded + legal hold window |
| Bookings / contracts | Contract life + statutory |
| Ratings | While account active + soft-delete window |

## 6. Rights & DPIA actions outstanding

- [ ] Confirm controller entity and DPO  
- [ ] Lawful basis matrix per vertical (care vs concierge)  
- [ ] SCCs / IDTA for any non-UK processors  
- [ ] Data subject request runbook  
- [ ] Breach notification playbook (ICO 72h)  
- [ ] Lawyer-reviewed terms, privacy notice, cookie policy  
- [ ] Residual risk sign-off before London pilot go-live  

## 7. Residual risks (engineering view)

1. Mock IDV in non-prod — never use MOCK vendor in production  
2. Special-category care data without explicit consent flows in all paths  
3. Family circle access — ensure least privilege on care household data  
4. Webhook endpoints — require `IDV_WEBHOOK_SECRET` / `STRIPE_WEBHOOK_SECRET` in prod  

---

Related: `docs/SECURITY.md`, `docs/COMPLIANCE_MATRIX.md`, `docs/PRODUCTION_PATH.md`, ADR human clearance.
