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
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 sm:px-6">
      <Badge tone="gold">NHS home pathway context · Family-approved security</Badge>
      <h1 className="text-3xl font-semibold text-zinc-100">
        Care at home — families &amp; carers
      </h1>
      <p className="text-zinc-400 leading-relaxed">
        As more complex support moves into people&apos;s homes, Aegis connects{" "}
        <strong className="text-zinc-200">families, recipients, and carers</strong>{" "}
        — including family/informal carers, companionship, learning disability
        support, and complex home care.{" "}
        <strong className="text-zinc-200">
          Security is approved by the people who need the service
        </strong>{" "}
        (family circle), after platform Trust &amp; Safety dual-control clearance.
      </p>

      <Card>
        <CardHeader title="Active home pathway roles" />
        <CardBody>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>
              <strong className="text-zinc-100">Companionship at home</strong>
            </li>
            <li>
              <strong className="text-zinc-100">Learning disability support</strong>
            </li>
            <li>
              <strong className="text-zinc-100">Family / informal carer</strong>
            </li>
            <li>
              <strong className="text-zinc-100">
                Complex care at home (NHS home pathway context)
              </strong>
            </li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How security works" />
        <CardBody>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-300">
            <li>Carer completes identity, DBS, safeguarding evidence</li>
            <li>Trust &amp; Safety dual-control CLEAR (CRITICAL risk)</li>
            <li>Family creates a household &amp; care circle</li>
            <li>Family/recipient <strong>approves</strong> that carer for the home</li>
            <li>Only then can booking / NDA complete</li>
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What Aegis is not" />
        <CardBody className="text-sm text-zinc-400 space-y-2">
          <p>Not an NHS organisation or commissioned NHS trust service.</p>
          <p>Not a CQC-registered care agency or local authority.</p>
          <p>
            Clinical accountability stays with registered professionals and
            formal commissioning (e.g. personal health budgets) where they apply.
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3">
        {session?.user?.role === "CLIENT" ? (
          <Link href="/client/care" className={buttonClass("primary", "md")}>
            Open care circle
          </Link>
        ) : null}
        {session?.user?.role === "PROVIDER" ? (
          <>
            <Link
              href="/provider/categories"
              className={buttonClass("primary", "md")}
            >
              Apply as carer
            </Link>
            <form action={joinCareWaitlist}>
              <button type="submit" className={buttonClass("secondary", "md")}>
                Agency pathway waitlist
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className={buttonClass("secondary", "md")}>
            Sign in
          </Link>
        )}
        <Link href="/categories" className={buttonClass("ghost", "md")}>
          All categories
        </Link>
      </div>
    </div>
  );
}
