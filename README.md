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
4. Provider bookings → CHECK_IN / CHECK_OUT  
5. Ops → KPIs, incidents, playbook, audit  

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js on port **3010** |
| `npm run build` | Production build |
| `npm test` | Vitest (match, AI, KPI) |
| `npm run db:seed` | Seed demo data |
| `npm run db:push` | Push Prisma schema |

## Product surface

- **Trust engine:** credential wallet, mock IDV, compliance matrix, AI advisory, ops clearance  
- **Concierge:** requests, explainable match, contracts, bookings, logs, reviews  
- **T&S:** queues, playbook, incidents, live KPIs, audit  
- **Scaffold:** `/verticals/security`, `/verticals/care`  
- **Docs:** `/docs/investor`, `/docs/architecture`, `/docs/compliance`  

## Disclaimer

Aegis facilitates evidence collection and human review. It does **not** replace regulated agency registration, CQC registration, SIA employment law advice, or solicitor-drafted contracts. Do not market “AI verified trustworthy.”

## Security posture

Palantir-grade ops aesthetic + stealth controls: hardened headers, rate-limited auth, role-gated routes, masked session display, audited logins/clearances, no stack fingerprint. See [docs/SECURITY.md](./docs/SECURITY.md).

## Future-proof platform

| Surface | Path |
|---|---|
| Health | `GET /api/v1/health` |
| Version + flags | `GET /api/v1/version` |
| Categories | `GET /api/v1/categories` |
| Session | `GET /api/v1/me` |
| Payment intent | `POST /api/v1/payments/intent` |
| Expiry sweep | `POST /api/v1/ops/expiry` (OPS) |
| Outbox peek | `GET /api/v1/events/outbox` (OPS) |
| Audit export | `npm run export:audit` |
| Expiry job | `npm run job:expiry` |

Adapters: encrypted local storage, notification outbox, payments stub, IDV port.  
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
