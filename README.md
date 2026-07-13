# Aegis Trust OS

**Trust infrastructure for high-stakes human services.**  
*AI assists. Humans adjudicate.*

**Aegis** is a hybrid agency + vertical trust-tech platform for premium concierge (live), security (scaffold), and care (scaffold). We sit on IDV rails (Trulioo/Socure-class later); we own role clearance, UK compliance evidence, and orchestration — we do not try to out-build horizontal IDV vendors.

## Quick start

```bash
cd workspace/aegis
npm install
cp .env.example .env   # if needed
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3010](http://localhost:3010).

### Optional Postgres

```bash
docker compose up -d
# set DATABASE_URL=postgresql://aegis:aegis@localhost:5433/aegis
# change prisma datasource provider to postgresql, then db push + seed
```

Default local DB is **SQLite** (`file:./dev.db`) so the demo runs without Docker.

## Demo accounts

Password for all: **`aegis-demo`**

| Email | Role |
|---|---|
| ops@aegis.demo | Trust & Safety ops |
| admin@aegis.demo | Admin |
| client@aegis.demo | VIP client (London) |
| ea@aegis.demo | EA client |
| pa@aegis.demo | Verified PA |
| driver@aegis.demo | Verified chauffeur |
| stylist@aegis.demo | In review |
| security@aegis.demo | Security waitlist |
| agency@aegis.demo | Partner org owner |

## 10-minute walkthrough

1. Sign in as `stylist@aegis.demo` → wallet / categories (in review)  
2. Sign in as `ops@aegis.demo` → review queue → open stylist → CLEAR with rationale  
3. Sign in as `client@aegis.demo` → new request (chauffeur/PA) → shortlist → Sign NDA + engage  
4. Provider bookings → CHECK_IN / CHECK_OUT → rate client; client rates member  
5. Ops → **Pilot** (`/ops/pilot`) → log interviews / export CSV  
6. Ops → KPIs, incidents, playbook, audit  
7. Public: `/pilot`, `/passport/sam-okonkwo-pa`, `/legal/terms`

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js on port **3010** |
| `npm run build` | Production build |
| `npm test` | Vitest |
| `npm run test:smoke` | Playwright browser smoke (server up) |
| `npm run ci` | test + build |
| `npm run db:seed` | Seed demo data |
| `npm run db:push` | Push Prisma schema |
| `npm run export:audit` | Audit NDJSON export |
| `npm run export:pilot` | Pilot leads CSV |
| `npm run job:expiry` | Credential / passport expiry |
| `npm run job:drain-outbox` | Domain event drain |

## Product surface

- **Trust engine:** credential wallet, IDV adapters + webhooks, OCR, compliance matrix, dual-control CLEAR  
- **Concierge:** requests, explainable match, contracts, bookings, logs, bidirectional ratings  
- **Care pathway:** family-approved carers, care circle  
- **Marketplace:** payment intents + Connect fee split (stub/Stripe)  
- **Pilot:** `/pilot` demand capture, `/ops/pilot` go-signal KPIs  
- **T&S:** queues, playbook, incidents, KPIs, audit  
- **Legal drafts:** `/legal/terms`, `/legal/privacy` (not lawyer-reviewed)  
- **Verticals:** security, care, robots  
- **Docs:** `/docs/*`, [PRODUCTION_PATH](./docs/PRODUCTION_PATH.md)  

## Disclaimer

Aegis facilitates evidence collection and human review. It does **not** replace regulated agency registration, CQC registration, SIA employment law advice, or solicitor-drafted contracts. Do not market “AI verified trustworthy.”

## Security posture

Palantir-grade ops aesthetic + stealth controls: hardened headers, rate-limited auth, role-gated routes, masked session display, audited logins/clearances, no stack fingerprint. See [docs/SECURITY.md](./docs/SECURITY.md).

## Future-proof platform

| Surface | Path |
|---|---|
| Health (liveness) | `GET /api/v1/health` |
| Ready (readiness) | `GET /api/v1/ready` |
| Metrics (Prometheus) | `GET /api/v1/metrics` |
| Version + flags | `GET /api/v1/version` |
| Categories | `GET /api/v1/categories` |
| Session | `GET /api/v1/me` |
| IDV complete | `POST /api/v1/idv/complete` |
| IDV webhook | `POST /api/v1/idv/webhook` |
| Payment intent | `POST /api/v1/payments/intent` |
| Payment webhook | `POST /api/v1/payments/webhook` |
| Pilot CSV | `GET /api/v1/ops/pilot/export` (OPS) |
| Expiry sweep | `POST /api/v1/ops/expiry` (OPS or `CRON_SECRET`) |
| Outbox peek | `GET /api/v1/events/outbox` (OPS) |

### CI/CD (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `CI` | PR + push | tests, build, Docker, Terraform validate, smoke |
| `CD · Vercel` | main / manual | deploy + ready probe |
| `CD · Terraform AWS` | manual | plan / apply staging\|prod |
| `CD · Kubernetes` | manual | apply manifests |
| `CD · Scheduled jobs` | cron | expiry + outbox drain |

Deploy guide: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md). Infra: `deploy/terraform`, `deploy/k8s`, `Dockerfile`, `vercel.json`.

Adapters: encrypted storage (local/S3), notify (file/webhook/Postmark/SES), payments (stub/Stripe Connect), IDV (MOCK/Trulioo/Socure).  
See [docs/PRODUCTION_PATH.md](./docs/PRODUCTION_PATH.md), [docs/FUTURE_PROOF.md](./docs/FUTURE_PROOF.md).

## Docs

- [Future-proof](./docs/FUTURE_PROOF.md)
- [Extensions](./docs/EXTENSIONS.md)
- [Security](./docs/SECURITY.md)
- [Brand](./docs/BRAND.md)
- [Investor narrative](./docs/INVESTOR_NARRATIVE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Hybrid IDV architecture](./docs/HYBRID_IDV_ARCHITECTURE.md)
- [Competitive matrix](./docs/COMPETITIVE_MATRIX.md)
- [Demand validation script](./docs/DEMAND_VALIDATION.md)
- [Compliance matrix](./docs/COMPLIANCE_MATRIX.md)
- [Trust & Safety playbook](./docs/TRUST_SAFETY_PLAYBOOK.md)
- [KPI framework](./docs/KPI_FRAMEWORK.md)
