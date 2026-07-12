export const NDA_TEMPLATE = `# Mutual Non-Disclosure Agreement (Simulated)

**Parties:** Client and Service Provider facilitated by Aegis Trust OS.

## 1. Purpose
The parties wish to explore and deliver premium personal/professional services requiring discretion.

## 2. Confidential information
Includes household details, schedules, contacts, security arrangements, health-adjacent context (if any), commercial terms, and any materials marked confidential.

## 3. Obligations
Each party shall not disclose confidential information to third parties except professional advisors under equivalent duty, or as required by law.

## 4. Term
Obligations survive for 3 years from signature (demo template — not legal advice).

## 5. Platform notice
Aegis provides contract orchestration and evidence storage. This template is a **simulation for product demo**, not a substitute for solicitor-drafted agreements.

**Signature:** Timestamped acceptance by both parties constitutes simulated e-sign.
`;

export const SERVICE_TEMPLATE = `# Service Engagement Terms (Simulated)

## Scope
Provider will deliver the services described in the linked service request, to a professional standard, with discretion appropriate to the client's risk tier.

## Status
Provider warrants that platform-held credentials for the engaged category are accurate to the best of their knowledge and that they will notify Aegis of material changes.

## Conduct
Respect privacy, household rules, and any site-specific instructions. Report incidents promptly via the platform.

## Payment
Commercial terms and payouts are handled offline or via future payment integration (stub in MVP).

## Liability notice
Aegis facilitates verification evidence and matching. Human Trust & Safety review does not eliminate all residual risk. Parties should maintain appropriate insurance.

## Demo disclaimer
This is a product template for orchestration flow testing — not legal advice.

**Signature:** Client and Provider simulated e-sign required before booking confirmation.
`;

export function renderTemplate(
  key: "NDA" | "SERVICE",
  vars: { clientName: string; providerName: string; title: string; location: string },
) {
  const base = key === "NDA" ? NDA_TEMPLATE : SERVICE_TEMPLATE;
  return `${base}

---
**Engagement:** ${vars.title}  
**Location:** ${vars.location}  
**Client:** ${vars.clientName}  
**Provider:** ${vars.providerName}  
**Generated:** ${new Date().toISOString()}
`;
}
