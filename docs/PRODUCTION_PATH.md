# Production path — SOTA readiness

## Local (default)

```bash
npm i
npx prisma db push
npm run db:seed
npm run dev
```

SQLite: `DATABASE_URL=file:./dev.db`  
Encrypted docs: `uploads/secure/` (AES-256-GCM)  
Notifications: `uploads/notify/outbox.ndjson` + `NotificationOutbox` table  
Payments: stub intents in `PaymentIntent` (with Connect fee fields)  

## Postgres

```bash
docker compose up -d
# In prisma/schema.prisma: provider = "postgresql"
# .env:
# DATABASE_URL=postgresql://aegis:aegis@localhost:5433/aegis
npx prisma db push   # or migrate dev
npm run db:seed
```

## Adapter env

| Variable | Values | Purpose |
|---|---|---|
| `IDV_VENDOR` | MOCK \| TRULIOO \| SOCURE | Identity vendor |
| `IDV_WEBHOOK_SECRET` | secret | HMAC / plain secret for `/api/v1/idv/webhook` |
| `TRULIOO_API_KEY` / `TRULIOO_BASE_URL` | … | Live Trulioo (optional) |
| `SOCURE_API_KEY` / `SOCURE_BASE_URL` | … | Live Socure (optional) |
| `STORAGE_BACKEND` | local_encrypted \| s3 | Document store |
| `DOCUMENT_ENCRYPTION_KEY` | secret | AES key material |
| `S3_BUCKET` / `S3_REGION` | … | When `STORAGE_BACKEND=s3` (+ AWS creds) |
| `NOTIFY_BACKEND` | file \| webhook \| postmark \| ses | Mail adapter |
| `NOTIFY_WEBHOOK_URL` | https://… | Email/SMS bridge (Zapier/n8n/mailer) |
| `POSTMARK_SERVER_TOKEN` / `NOTIFY_FROM_EMAIL` | … | Postmark |
| `SES_REGION` + AWS keys | … | SES SendEmail |
| `PILOT_NOTIFY_EMAIL` | ops@… | Pilot interest alerts |
| `PAYMENTS_BACKEND` | stub \| stripe | Payments |
| `STRIPE_SECRET_KEY` | sk_… | Live Stripe PaymentIntents |
| `STRIPE_WEBHOOK_SECRET` | whsec_… | `/api/v1/payments/webhook` |
| `PLATFORM_FEE_BPS` | 0–5000 (default 1500) | Marketplace platform fee (15%) |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | … | Multi-instance rate limits |
| `DOMAIN_EVENT_WEBHOOK_URL` | https://… | Outbox drain target |

## Jobs

```bash
npm run job:expiry        # credential expiry + passport suspend
npm run job:drain-outbox  # publish domain events (+ optional webhook)
npm run export:audit      # SIEM NDJSON
```

## IDV + webhooks

```
provider start → IdvProvider.startCheck
              → IdvCheck PENDING (externalRef = vendor session)
              → vendor callback POST /api/v1/idv/webhook
              → applyIdvWebhookResult (terminal PASSED/FAILED)
              → human CLEAR still required for VERIFIED
```

- Port: `src/lib/idv/provider.ts` (MOCK / Trulioo / Socure)
- Service: `src/lib/services/idv-service.ts`
- Webhook: `POST /api/v1/idv/webhook`

Mock webhook (dev):

```bash
curl -X POST http://localhost:3010/api/v1/idv/webhook \
  -H 'Content-Type: application/json' \
  -H "X-Aegis-Idv-Secret: $IDV_WEBHOOK_SECRET" \
  -d '{"sessionId":"<externalRef>","status":"PASSED","livenessScore":0.96}'
```

## Payments + Connect marketplace

```
createIntent → application_fee_amount + transfer_data.destination (when provider has Connect)
            → PaymentIntent.applicationFeePence / transferDestination
            → Stripe webhook → SUCCEEDED / CANCELLED
provider wallet → ensureConnectAccount (Express onboarding)
```

- Port: `src/lib/ports/payments.ts`
- Stub + Stripe: `src/lib/adapters/payments/*`
- Webhook: `POST /api/v1/payments/webhook`

## OCR + deterministic validation

```
image/text → OcrPort (mock today; Textract later)
          → parseTextFields + Zod validators (deterministic)
          → requiresManualReview flag
          → wallet/ops ExtractedFields UI
          → human CLEAR only
```

## Dual control

CRITICAL categories (care, care-home robots, etc.) require **two distinct OPS/ADMIN reviewers** to CLEAR before VERIFIED / passport issue.

## CI

```bash
npm test              # vitest
npm run build
npm run test:smoke    # Playwright (server must be up)
```

GitHub Actions: `.github/workflows/ci.yml` — unit/build + Playwright smoke.

## SOTA checklist

- [x] Encrypted local evidence store  
- [x] Notification outbox + webhook bridge  
- [x] Payment intent stub + Stripe adapter  
- [x] S3 storage adapter (needs `@aws-sdk/client-s3` + bucket)  
- [x] Upstash Redis rate limits  
- [x] Dual-control CLEAR for CRITICAL  
- [x] Outbox drain job  
- [x] OCR + deterministic validation  
- [x] Care pathway (family-approved)  
- [x] Bidirectional member ratings  
- [x] IDV webhook callbacks + vendor adapters (keys optional)  
- [x] Stripe Connect marketplace fee split (shaped; needs live keys)  
- [x] CI Playwright + build pipeline  
- [x] DPIA skeleton (`docs/DPIA.md`) — not lawyer-reviewed  
- [x] Draft terms + privacy pages (`/legal/*`) — not lawyer-reviewed  
- [x] London pilot demand capture (`/pilot`, `/ops/pilot`, PilotLead KPIs)  
- [x] Prod env guards for IDV/Stripe webhook secrets  
- [x] Postmark + SES notify adapters (keys optional)  
- [x] Pilot honeypot + rate limit + CSV export  
- [x] Client reputation (provider→client ratings on console)  
- [x] Health readiness flags + expanded version surfaces  
- [x] CI/CD pipelines (GitHub Actions: CI + Vercel + Docker/GHCR + Terraform + K8s + cron jobs)  
- [x] Docker standalone image + K8s manifests + Terraform AWS baseline  
- [x] Prometheus metrics + Grafana dashboard + `/ready` probe  
- [ ] Configure GitHub secrets (VERCEL_*, AWS_*, CRON_SECRET, DEPLOY_URL)  
- [ ] Live vendor keys in staging (Trulioo/Socure + Stripe Connect + mail)  
- [ ] Lawyer sign-off on terms / privacy / DPIA  
- [ ] Complete 10–15 real interviews (tooling ready; execution is GTM)  

## Pilot tooling

| Surface | Purpose |
|---|---|
| `/pilot` | Public interest (buyer / supply / agency) |
| `/ops/pilot` | Interview capture sheet + go-signal KPIs |
| `PilotLead` | Durable demand/supply pipeline |
| DEMAND_VALIDATION.md | Script & outreach copy |

Go signal (engineered): ≥10 interviews and ≥70% interest ≥7/10.

## Invariants

Human CLEAR only · encrypted evidence at rest (local) · incident freeze passport · expiry hygiene · dual-control CRITICAL · webhook auth in production
