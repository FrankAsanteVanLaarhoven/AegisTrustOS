import Link from "next/link";
import { submitPilotInterest } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PilotPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6">
      <div>
        <Badge tone="gold">London pilot</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-100">
          Join the Aegis pilot
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          We are validating demand for vetted premium concierge (PA, chauffeur,
          household) with human Trust &amp; Safety clearance — not another gig
          app. Tell us how you source people today and whether a pilot booking
          is realistic in the next 30 days.
        </p>
      </div>

      {sp.ok ? (
        <Card>
          <CardBody className="space-y-2 text-sm text-zinc-300">
            <p className="font-medium text-[#3dd6c6]">Interest recorded.</p>
            <p>
              We will only re-contact for pilot coordination. No marketing spam.
              See our{" "}
              <Link href="/legal/privacy" className="text-[#e87722] hover:underline">
                privacy notice
              </Link>
              .
            </p>
            <Link href="/" className={buttonClass("secondary", "sm")}>
              Back to home
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Pilot interest"
            subtitle="Demand · supply · agency white-label"
          />
          <CardBody>
            {sp.error ? (
              <p className="mb-3 text-sm text-red-400">
                Please provide a valid name and email.
              </p>
            ) : null}
            <form action={submitPilotInterest} className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-1">
                <span className="text-zinc-400">Name</span>
                <input
                  name="name"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">Organisation</span>
                <input
                  name="organisation"
                  placeholder="Family office / agency / company"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">I am a…</span>
                <select
                  name="side"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm text-zinc-100"
                  defaultValue="buyer"
                >
                  <option value="buyer">Buyer / EA / household</option>
                  <option value="provider">Provider (supply)</option>
                  <option value="agency">Boutique agency</option>
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-zinc-400">
                  Categories of interest (comma-separated)
                </span>
                <input
                  name="categories"
                  placeholder="PA, chauffeur, household"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-zinc-400">
                  Named use case in next 30 days (optional)
                </span>
                <input
                  name="nextUseCase"
                  placeholder="e.g. Heathrow transfer + evening standby"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-zinc-400">Notes</span>
                <textarea
                  name="notes"
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <p className="sm:col-span-2 text-[11px] text-zinc-600">
                By submitting you agree to our{" "}
                <Link href="/legal/terms" className="text-zinc-400 hover:underline">
                  terms
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="text-zinc-400 hover:underline">
                  privacy notice
                </Link>
                . Draft only — not lawyer-reviewed.
              </p>
              <div className="sm:col-span-2">
                <button type="submit" className={buttonClass("primary", "md")}>
                  Register interest
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <p className="text-xs text-zinc-600">
        Interview script &amp; targets: see internal demand validation doc.
        Ops capture lives at{" "}
        <code className="text-zinc-500">/ops/pilot</code>.
      </p>
    </div>
  );
}
