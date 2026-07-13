import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Privacy notice — Aegis",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6">
      <Badge tone="warn">Draft · not lawyer-reviewed</Badge>
      <h1 className="text-3xl font-semibold text-zinc-100">Privacy notice</h1>
      <p className="text-sm text-zinc-500">
        Last updated: 2026-07-13 · Complements internal DPIA skeleton
        (docs/DPIA.md). Complete with counsel before production.
      </p>

      <section className="space-y-3 text-sm leading-relaxed text-zinc-400">
        <h2 className="text-lg font-medium text-zinc-200">1. Controller</h2>
        <p>
          Controller entity is TBD for the pilot. Contact via the{" "}
          <Link href="/pilot" className="text-[#e87722] hover:underline">
            pilot form
          </Link>{" "}
          until a formal privacy@ address is published.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">2. Data we process</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account: name, email, role, password hash</li>
          <li>Identity: ID images, selfie/liveness scores, OCR extractions</li>
          <li>Credentials: certificates, licences, verification status</li>
          <li>Operational: bookings, contracts, logs, ratings, incidents</li>
          <li>Care circle: household membership and carer approvals</li>
          <li>Payments: intent amounts, Connect account ids (no full card PAN)</li>
          <li>Pilot: interest forms and interview capture notes</li>
          <li>Technical: audit events, IP where recorded, security logs</li>
        </ul>

        <h2 className="text-lg font-medium text-zinc-200">3. Purposes &amp; bases</h2>
        <p>
          Provide the platform (contract / steps prior to contract); prevent
          fraud and maintain Trust &amp; Safety (legitimate interests); comply
          with law where applicable; pilot demand research (legitimate interests
          / consent for optional notes). Special-category or care-adjacent data
          will only be processed with an appropriate UK GDPR basis once counsel
          confirms.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">4. Processors</h2>
        <p>
          Hosting, Stripe (payments), optional IDV vendors (Trulioo/Socure),
          object storage, and notification bridges as configured. See{" "}
          <code className="text-zinc-500">docs/DPIA.md</code>.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">5. Retention</h2>
        <p>
          Audit retention defaults to multi-year configuration
          (AUDIT_RETENTION_DAYS). Identity evidence retained while needed for
          verification and legal holds. Pilot leads retained for pilot
          coordination then deleted or anonymised on request where feasible.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">6. Security</h2>
        <p>
          Encrypted evidence at rest (AES-GCM local or S3), session auth,
          rate limits, dual-control for CRITICAL clearances, incident freeze of
          passports. No system is perfectly secure.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">7. Your rights</h2>
        <p>
          Under UK GDPR you may have rights of access, rectification, erasure,
          restriction, portability, and objection. Exercise via pilot contact
          during the demo phase. You may complain to the ICO.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">8. International transfers</h2>
        <p>
          Prefer UK/EU regions. Where vendors process outside the UK, appropriate
          transfer mechanisms (IDTA/SCCs) will be documented before go-live.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">9. Cookies</h2>
        <p>
          Essential session cookies for authentication. No third-party
          advertising cookies in the current build.
        </p>

        <p className="pt-4">
          <Link href="/legal/terms" className="text-[#e87722] hover:underline">
            Terms of use
          </Link>
        </p>
      </section>
    </article>
  );
}
