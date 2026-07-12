# ADR 0001 — Hybrid IDV (adapter, not rebuild)

## Status

Accepted

## Context

Horizontal IDV (Trulioo, Socure, Jumio) owns document coverage and fraud ML. Rebuilding that is capital-destructive and not our moat.

## Decision

Aegis consumes IDV via `IdvProvider` port. Domain trust clearance remains human + category matrix.

## Consequences

- Swap vendors with env `IDV_VENDOR`  
- Mock for local demo  
- Production keys never required for vertical product development  
