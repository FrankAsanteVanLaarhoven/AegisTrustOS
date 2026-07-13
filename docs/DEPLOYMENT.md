# Deployment & CI/CD — Aegis Trust OS

## Pipeline map

```
┌──────────── PR / push ────────────┐
│  CI (ci.yml)                      │
│  • unit tests + build             │
│  • Docker build (+ push on main)  │
│  • Terraform validate (+ plan)    │
│  • Playwright smoke + probes      │
└───────────────┬───────────────────┘
                │ main
    ┌───────────┼───────────┬────────────────┐
    ▼           ▼           ▼                ▼
 CD Vercel   GHCR image  Terraform*      K8s apply*
 (auto)      (auto)      (manual)        (manual)
    │
    ▼
 Scheduled jobs (cd-jobs.yml)
  • hourly expiry via /api/v1/ops/expiry + CRON_SECRET
  • outbox drain via DATABASE_URL
```

\* Requires secrets configured; otherwise skips with a notice.

---

## What you need vs optional

| Capability | Pipeline | Required secrets / vars |
|---|---|---|
| Unit + smoke | `ci.yml` | none |
| Docker → GHCR | `ci.yml` | `GITHUB_TOKEN` (built-in) |
| Vercel prod | `cd-vercel.yml` | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| AWS data plane | `cd-terraform.yml` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AUTH_SECRET`, `DOCUMENT_ENCRYPTION_KEY` |
| Kubernetes | `cd-k8s.yml` | `KUBE_CONFIG` (base64 kubeconfig) |
| Cron expiry | `cd-jobs.yml` | `DEPLOY_URL`, `CRON_SECRET` |
| Outbox drain | `cd-jobs.yml` | `DATABASE_URL` |

### Intentionally not in default pipeline

| Tool | Why |
|---|---|
| **Jenkins** | GitHub Actions replaces it unless corporate mandate |
| **Ansible** | Terraform + container image; no bare-metal fleet |
| **Microservices** | Modular monolith; extract workers later |
| **Service mesh** | No multi-service traffic to mesh |

Architecture decision: [ADR 0003](./ADR/0003-modular-monolith-deploy.md).

---

## GitHub Environments

Create environments **`staging`** and **`production`** with protection rules.

### Secrets checklist

```
# Vercel
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# App / jobs
AUTH_SECRET
CRON_SECRET
DEPLOY_URL                 # https://your-app.vercel.app
DATABASE_URL               # Postgres for job runners
DOCUMENT_ENCRYPTION_KEY

# AWS Terraform
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# Kubernetes
KUBE_CONFIG                # base64 -w0 ~/.kube/config
```

### Variables

```
AWS_REGION=eu-west-2
```

---

## Path A — Vercel (pilot default)

**Step-by-step:** [VERCEL_SETUP.md](./VERCEL_SETUP.md)

1. Create Vercel project from GitHub repo  
2. Set Postgres `DATABASE_URL` (Neon/Supabase/RDS)  
3. Build uses `npm run build:deploy` → auto-sets Prisma **postgresql** + `db push`  
4. Set GitHub secrets → push to `main` → `CD · Vercel` runs  
5. Set `CRON_SECRET` in Vercel + GitHub for scheduled expiry  

`vercel.json` includes hourly cron hit to `/api/v1/ops/expiry` (authorize with `CRON_SECRET`).

---

## Path B — Docker / AWS / K8s

```bash
# Local prod-like
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --build

# Observability
docker compose -f deploy/docker-compose.observability.yml up -d
# Prometheus :9090  Grafana :3001 (admin / aegis-grafana)

# Terraform staging
cd deploy/terraform
cp staging.tfvars.example staging.tfvars
terraform init && terraform plan -var-file=staging.tfvars
# Or: GitHub → Actions → CD · Terraform AWS → plan | apply

# K8s
# GitHub → Actions → CD · Kubernetes (set image tag)
kubectl -n aegis get pods
```

Terraform creates: VPC, RDS Postgres, S3 evidence, Secrets Manager, IAM role.

---

## Backend probes (wired)

| Endpoint | Use |
|---|---|
| `GET /api/v1/health` | Liveness |
| `GET /api/v1/ready` | Readiness (DB + prod env guards) |
| `GET /api/v1/metrics` | Prometheus scrape |
| `POST /api/v1/ops/expiry` | Cron with `Authorization: Bearer $CRON_SECRET` |

---

## CI local parity

```bash
npm test && npm run build
NEXT_OUTPUT=standalone docker build -t aegis-trust-os:local .
curl -sf http://localhost:3010/api/v1/ready
curl -sf http://localhost:3010/api/v1/metrics | head
```

---

## Go-live checklist

- [ ] CI green on `main`  
- [ ] Vercel or K8s deploy succeeded  
- [ ] `/api/v1/ready` → 200  
- [ ] Postgres (not SQLite)  
- [ ] `CRON_SECRET` + scheduled expiry  
- [ ] Metrics scraped (Grafana/Prometheus or Vercel analytics)  
- [ ] Webhook secrets if live IDV/Stripe  
- [ ] Backups / PITR on Postgres  

Related: [PRODUCTION_PATH.md](./PRODUCTION_PATH.md), [SECURITY.md](./SECURITY.md).
