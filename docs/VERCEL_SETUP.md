# Vercel setup (15 minutes)

## 1. Database (Neon recommended)

1. Create project at [neon.tech](https://neon.tech) (region **Europe**)
2. Copy connection string (pooled + direct both work for Prisma)
3. Format: `postgresql://user:pass@host/neondb?sslmode=require`

## 2. Vercel project

```bash
npm i -g vercel
vercel login
vercel link          # link to FrankAsanteVanLaarhoven/AegisTrustOS
```

Or: Vercel Dashboard → Add New Project → import GitHub repo.

## 3. Environment variables (Production + Preview)

| Name | Example |
|---|---|
| `DATABASE_URL` | `postgresql://…?sslmode=require` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `DOCUMENT_ENCRYPTION_KEY` | same strength as AUTH_SECRET |
| `IDV_VENDOR` | `MOCK` (until live keys) |
| `PAYMENTS_BACKEND` | `stub` |
| `NOTIFY_BACKEND` | `file` or `postmark` |
| `STORAGE_BACKEND` | `local_encrypted` (or `s3` + AWS) |
| `APP_VERSION` | `0.1.0` |

`build:deploy` auto-selects **postgresql** when `DATABASE_URL` is Postgres and runs `prisma db push`.

## 4. GitHub Actions secrets (CD · Vercel)

```
VERCEL_TOKEN          # Account → Tokens
VERCEL_ORG_ID         # Project Settings → General
VERCEL_PROJECT_ID
CRON_SECRET           # same as Vercel
DEPLOY_URL            # https://your-app.vercel.app
DATABASE_URL          # for scheduled outbox drain job
AUTH_SECRET
```

Get org/project IDs:

```bash
vercel project ls
# or .vercel/project.json after `vercel link`
```

## 5. Deploy

```bash
# CLI
vercel --prod

# or push to main (triggers CD · Vercel when secrets exist)
git push origin main
```

## 6. Seed staging data (once)

```bash
DATABASE_URL='postgresql://…' npm run db:provider -- postgresql
DATABASE_URL='postgresql://…' npx prisma generate
DATABASE_URL='postgresql://…' npm run db:seed
# restore local sqlite for dev:
npm run db:provider -- sqlite && npx prisma generate
```

## 7. Verify

```bash
curl -s https://YOUR_APP/api/v1/ready | jq
curl -s https://YOUR_APP/api/v1/metrics | head
curl -s -X POST https://YOUR_APP/api/v1/ops/expiry \
  -H "Authorization: Bearer $CRON_SECRET"
```

Demo login still works after seed: `ops@aegis.demo` / `aegis-demo`.

## 8. Custom domain

Vercel → Domains → add → set `NEXTAUTH_URL` to the custom URL → redeploy.
