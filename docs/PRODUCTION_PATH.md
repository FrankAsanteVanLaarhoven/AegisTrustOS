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
| `NOTIFY_BACKEND` | file \| ses \| postmark | Email rail |
| `PAYMENTS_BACKEND` | stub \| stripe | Payments |
| `STRIPE_SECRET_KEY` | sk_… | When stripe |

## Jobs

```bash
npm run job:expiry   # credential expiry + passport suspend
npm run export:audit # SIEM NDJSON
```

## SOTA checklist (remaining)

- [ ] Live IDV vendor keys + webhook callbacks  
- [ ] S3 adapter implementation  
- [ ] SES/Postmark send path  
- [ ] Stripe Connect capture on booking complete  
- [ ] Redis rate limits multi-instance  
- [ ] CI Playwright + migrate deploy pipeline  
- [ ] DPIA + lawyer-reviewed terms  

## Invariants

Human CLEAR only · encrypted evidence at rest (local) · incident freeze passport · expiry hygiene
