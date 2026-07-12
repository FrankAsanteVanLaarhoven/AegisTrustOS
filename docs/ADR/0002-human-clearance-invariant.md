# ADR 0002 — Human clearance invariant

## Status

Accepted

## Context

AI overclaim creates legal and reputational risk in care/security-adjacent services.

## Decision

No code path may set category/provider `VERIFIED` without a `TrustReview` recorded by OPS/ADMIN. AI only produces advisory signals and triage priority.

## Consequences

- `recordTrustDecision` is the single application entry for clearance  
- Marketing and UI must never say “AI verified trustworthy”  
- Audit + outbox always record the human decision  
