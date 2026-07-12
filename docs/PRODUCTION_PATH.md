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
Payments: stub intents in `PaymentIntent`

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
| `STORAGE_BACKEND` | local_encrypted \| s3 | Document store |
| `DOCUMENT_ENCRYPTION_KEY` | secret | AES key material |
| `S3_BUCKET` / `S3_REGION` | … | When `STORAGE_BACKEND=s3` (+ AWS creds) |
| `NOTIFY_WEBHOOK_URL` | https://… | Email/SMS bridge (Zapier/n8n/mailer) |
| `PAYMENTS_BACKEND` | stub \| stripe | Payments |
| `STRIPE_SECRET_KEY` | sk_… | Live Stripe PaymentIntents |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | … | Multi-instance rate limits |
| `DOMAIN_EVENT_WEBHOOK_URL` | https://… | Outbox drain target |

## Jobs

```bash
npm run job:expiry        # credential expiry + passport suspend
npm run job:drain-outbox  # publish domain events (+ optional webhook)
npm run export:audit      # SIEM NDJSON
```

## Dual control

CRITICAL categories (care, care-home robots, etc.) require **two distinct OPS/ADMIN reviewers** to CLEAR before VERIFIED / passport issue.

## SOTA checklist (remaining)

- [x] Encrypted local evidence store  
- [x] Notification outbox + webhook bridge  
- [x] Payment intent stub + Stripe adapter  
- [x] S3 storage adapter (needs `@aws-sdk/client-s3` + bucket)  
- [x] Upstash Redis rate limits  
- [x] Dual-control CLEAR for CRITICAL  
- [x] Outbox drain job  
- [ ] Live IDV vendor keys + webhook callbacks  
- [ ] Stripe Connect marketplace split  
- [ ] CI Playwright + migrate deploy pipeline  
- [ ] DPIA + lawyer-reviewed terms  

## Invariants

Human CLEAR only · encrypted evidence at rest (local) · incident freeze passport · expiry hygiene
