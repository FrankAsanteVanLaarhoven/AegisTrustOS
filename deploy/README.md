# Deploy assets

| Path | Purpose |
|---|---|
| `../Dockerfile` | Production container (standalone Next.js) |
| `../vercel.json` | Vercel region + cron |
| `docker-compose.prod.yml` | App + Postgres stack |
| `docker-compose.observability.yml` | Prometheus + Grafana |
| `prometheus/` | Scrape config → `/api/v1/metrics` |
| `grafana/` | Provisioned Aegis dashboard |
| `terraform/` | AWS VPC, RDS, S3, Secrets, IAM |
| `k8s/` | Namespace, Deployment, Service, Ingress, CronJobs, ServiceMonitor |

Full pipeline docs: [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)

```bash
# From repo root
npm run docker:build
npm run docker:up
npm run obs:up
```
