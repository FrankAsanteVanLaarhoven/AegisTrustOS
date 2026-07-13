# Vercel setup — fix “No Production Deployment”

That banner means **no successful Production deployment is assigned to your domain**.  
The project may be linked, but **Production has never built cleanly** (or only Preview deploys exist).

---

## Fix in 10 minutes

### A. Minimum env (Vercel → Project → Settings → Environment Variables)

Add for **Production** (and Preview if you want):

| Name | Value |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` output |
| `NEXTAUTH_URL` | `https://YOUR-PROJECT.vercel.app` (exact prod URL) |
| `DATABASE_URL` | Neon/Supabase `postgresql://…?sslmode=require` |

Optional later: `CRON_SECRET`, `DOCUMENT_ENCRYPTION_KEY`, Stripe, etc.

> Without `DATABASE_URL` the **site can still deploy**; DB pages will error until Postgres is set.

### B. Trigger a Production deploy

**Dashboard (easiest)**  
1. Deployments  
2. Open the latest deployment (or **Redeploy**)  
3. Confirm it is **Production** (not Preview)  
4. If it failed, open **Building** logs and fix the error  

**Or CLI**

```bash
cd workspace/aegis
npx vercel login
npx vercel link          # select the project
npx vercel --prod --yes
```

**Or Git**  
Connect GitHub → ensure **Production Branch = `main`** → push any commit to `main`.

### C. Assign the domain

Project → **Domains** → production domain should show **Valid** and point at the latest **Ready** Production deployment.  
If it says “not serving traffic”, click the domain → assign latest Production deployment, or redeploy Production.

### D. Verify

```bash
curl -sS https://YOUR-PROJECT.vercel.app/api/v1/health
curl -sS https://YOUR-PROJECT.vercel.app/api/v1/ready
```

Expect HTTP 200 JSON with `"ok":true` (ready needs DB).

---

## Common failure causes

| Symptom | Cause | Fix |
|---|---|---|
| Banner: no production traffic | Never promoted / all builds failed | Redeploy **Production** after env set |
| Build error on `npm ci` | Lockfile mismatch | Commit lockfile; or set install to `npm install` |
| Build error Prisma / db push | Bad `DATABASE_URL` | Fix URL; push no longer blocks build |
| Cron config error | Crons need Pro | Crons removed from `vercel.json`; use GitHub `cd-jobs.yml` |
| 500 after deploy | No / wrong `DATABASE_URL` | Add Neon URL; run schema push |
| Auth broken | Wrong `NEXTAUTH_URL` | Must match production HTTPS URL |
| Root Directory wrong | Monorepo setting | Set Root to `.` (repo root) |

---

## Postgres (recommended before real use)

1. [neon.tech](https://neon.tech) → EU project  
2. Copy connection string → Vercel `DATABASE_URL`  
3. Redeploy Production  
4. Seed once (local machine):

```bash
export DATABASE_URL='postgresql://…?sslmode=require'
npm run db:provider -- postgresql
npx prisma generate
npx prisma db push
npm run db:seed
# back to local sqlite:
npm run db:provider -- sqlite && npx prisma generate
```

Demo: `ops@aegis.demo` / `aegis-demo`

---

## GitHub Actions CD

Secrets (repo → Settings → Secrets):

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

Then every push to `main` runs **CD · Vercel**.  
Without these secrets, deploy only via Vercel Git integration or CLI.

Get IDs after `npx vercel link` from `.vercel/project.json`.

---

## Build pipeline (what Production runs)

```
npm ci
npm run build:deploy
  → set Prisma provider from DATABASE_URL
  → prisma generate
  → prisma db push (best-effort)
  → next build
```

Cron / expiry: **GitHub Actions** `cd-jobs.yml` with `DEPLOY_URL` + `CRON_SECRET` (not Vercel Cron on Hobby).

---

## Still stuck?

1. Deployments → failed row → copy **Build** log error  
2. Confirm **Production** env vars are checked (not only Preview)  
3. Settings → Git → Production Branch = `main`  
4. Redeploy with **Clear cache and redeploy**
