# Aegis stealth security measures

Palantir-grade operational posture: minimise attack surface, leak nothing useful to adversaries, audit everything that matters.

## Implemented (MVP)

| Control | Detail |
|---|---|
| **No `X-Powered-By`** | `poweredByHeader: false` + header strip |
| **Security headers** | nosniff, DENY frames, no-referrer, Permissions-Policy, COOP/CORP, HSTS (prod TLS) |
| **CSP** | default self; frame-ancestors none; object-src none |
| **Rate limits** | Auth endpoints + global IP sliding window (in-memory; Redis for multi-node) |
| **Session** | JWT 8h max, httpOnly cookies, secure in production, custom cookie name |
| **Auth failures** | Generic “Authentication failed”; audit LOGIN_FAIL / RATE_LIMITED (hashed email) |
| **Route gates** | Middleware role checks for /ops, /admin, /provider, /client, APIs |
| **Stealth redirects** | Forbidden → home (no “exists but forbidden” leak on HTML) |
| **PII display** | `maskEmail` / `maskId` in chrome; full email only in clearance packs for OPS |
| **Trust decisions** | Human-only CLEAR; full audit payload |
| **Request IDs** | Non-sequential `X-Request-Id` for correlation |
| **Robots** | `noindex` on app metadata |

## Operator expectations

- Treat demo password as non-production  
- Rotate `AUTH_SECRET` before any public deploy  
- Put TLS terminator + WAF in front for real traffic  
- Replace in-memory rate limit with Redis / edge  
- Complete DPIA before live UK personal data  

## Explicit non-goals (yet)

- Full SIEM export  
- Hardware key / WebAuthn  
- Field-level encryption at rest  
- Zero-trust device posture  

These are roadmap items under the same stealth doctrine.
