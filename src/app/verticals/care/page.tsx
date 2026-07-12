import Link from "next/link";
import { auth } from "@/lib/auth";
import { joinCareWaitlist } from "@/lib/actions";
import { isFeatureEnabled } from "@/config/features";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default async function CareVerticalPage() {
  const session = await auth();
  const enabled = isFeatureEnabled("careVertical");

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 sm:px-6">
        <Badge tone="muted">Feature flag off</Badge>
        <h1 className="text-2xl font-semibold text-zinc-100">Care vertical</h1>
        <p className="text-sm text-zinc-500">
          Disabled via FEATURE_FLAGS. Code retained for future activation.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 sm:px-6">
      <Badge tone="muted">Phase 4 · Scaffold / waitlist</Badge>
      <h1 className="text-3xl font-semibold text-zinc-100">Care services</h1>
      <p className="text-zinc-400 leading-relaxed">
        Home care, live-in care, and specialist carers sit in the highest risk
        tier: safeguarding, DBS, continuity, family transparency, and liability.
        Aegis does <strong>not</strong> claim CQC registration or clinical
        medication workflows in this MVP.
      </p>

      <Card>
        <CardHeader title="Compliance expectations (scaffold)" />
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            <li>Enhanced DBS</li>
            <li>Safeguarding training evidence</li>
            <li>Identity + right to work + references</li>
            <li>Insurance</li>
            <li>Medication cert flag only (no meds admin product)</li>
            <li>Future: rostering, care notes, family portal</li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Interest list" />
        <CardBody className="space-y-3">
          {session?.user?.role === "PROVIDER" ? (
            <form action={joinCareWaitlist}>
              <button type="submit" className={buttonClass("primary", "md")}>
                Join home-care interest list
              </button>
            </form>
          ) : (
            <p className="text-sm text-zinc-400">
              <Link href="/login" className="underline">
                Sign in as a provider
              </Link>{" "}
              to register interest.
            </p>
          )}
          <p className="text-xs text-zinc-500">
            Launch care only after category-specific operational tooling exists.
            Early care expansion is the fastest way to drown in compliance before
            PMF.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
