import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Terms of use — Aegis",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6 prose-invert">
      <Badge tone="warn">Draft · not lawyer-reviewed</Badge>
      <h1 className="text-3xl font-semibold text-zinc-100">Terms of use</h1>
      <p className="text-sm text-zinc-500">
        Last updated: 2026-07-13 · Operating entity TBD · UK-oriented draft for
        pilot demos only.
      </p>

      <section className="space-y-3 text-sm leading-relaxed text-zinc-400">
        <h2 className="text-lg font-medium text-zinc-200">1. Nature of service</h2>
        <p>
          Aegis provides software-facilitated trust infrastructure and
          orchestration for high-stakes personal services (identity evidence
          collection, category compliance workflows, matching, contracts,
          bookings, and Trust &amp; Safety review). Aegis is{" "}
          <strong className="text-zinc-300">not</strong> a regulated care agency,
          CQC-registered provider, SIA ACS, employment agency guarantee, or
          insurer unless separately contracted.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">2. Human clearance</h2>
        <p>
          Automated and AI-assisted signals are advisory only. Final clearance
          decisions for verified status are made by human Trust &amp; Safety
          operators. CRITICAL categories may require dual-control clearance.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">3. Accounts</h2>
        <p>
          You must provide accurate information, protect credentials, and notify
          us of suspected compromise. We may suspend accounts for fraud,
          incidents, policy breach, or legal risk.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">4. Providers</h2>
        <p>
          Providers are responsible for the accuracy of credentials and
          eligibility to work. Upload of identity documents consents to
          processing for verification and audit. Marketplace payouts (when
          enabled) may use Stripe Connect subject to Stripe&apos;s terms.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">5. Clients &amp; care</h2>
        <p>
          Clients remain responsible for suitability decisions for their
          household. Care-circle features are family-facilitated coordination
          tools — not clinical or regulated care delivery by Aegis.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">6. Payments</h2>
        <p>
          Fees, platform take-rates, and refunds will be disclosed at checkout
          when live payments are enabled. Stub payment intents in demo do not
          charge real cards.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">7. Acceptable use</h2>
        <p>
          No unlawful activity, harassment, scraping, reverse engineering of
          security controls, or submission of fraudulent identity material.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">8. Liability</h2>
        <p>
          To the fullest extent permitted by law, Aegis is not liable for
          third-party conduct of clients or providers. Nothing excludes liability
          that cannot be limited under UK law.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">9. Changes</h2>
        <p>
          We may update these terms for the pilot. Material changes will be
          indicated by the date above. Continued use after notice constitutes
          acceptance where permitted.
        </p>

        <h2 className="text-lg font-medium text-zinc-200">10. Contact</h2>
        <p>
          Pilot enquiries: use{" "}
          <Link href="/pilot" className="text-[#e87722] hover:underline">
            /pilot
          </Link>
          . Privacy:{" "}
          <Link href="/legal/privacy" className="text-[#e87722] hover:underline">
            privacy notice
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
