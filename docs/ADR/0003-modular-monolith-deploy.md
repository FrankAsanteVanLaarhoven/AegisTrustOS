# ADR 0003 — Modular monolith first; extract services later

## Status
Accepted (2026-07-13)

## Context
Aegis is a trust + orchestration platform. Stakeholders may request “full” industry stacks (Kubernetes, microservices, Jenkins, Ansible, multi-region). Premature distribution increases operational risk without improving pilot trust outcomes.

## Decision
1. **Ship as a modular monolith** (Next.js App Router + Prisma + port/adapter boundaries already in code).
2. **Deploy path A (pilot / default):** Vercel (web) + managed Postgres + object storage + managed secrets.
3. **Deploy path B (enterprise / control plane):** Docker → ECS Fargate or Kubernetes, Terraform-managed AWS, Prometheus/Grafana.
4. **Do not** split microservices until a clear scale or team boundary appears (e.g. IDV webhook worker, outbox publisher, OCR).
5. **CI:** GitHub Actions (already). Jenkins is optional only if corporate policy mandates it.
6. **Config management:** env + Terraform; Ansible only for bare-metal/bootstrap edge cases.

## Consequences
- Faster pilot iteration, single deploy unit, shared transactions (SQLite/Postgres).
- Extract workers via existing ports (`Notifier`, `EventBus`, jobs scripts) without rewrite.
- Observability and infra-as-code land now; K8s is optional, not required for go-live.

## When to revisit
- Sustained >50 RPS with job latency SLOs missed  
- Separate team owns IDV/payments exclusively  
- Multi-tenant white-label isolation requires separate data planes  
