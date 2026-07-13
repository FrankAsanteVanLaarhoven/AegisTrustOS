import Link from "next/link";
import { auth } from "@/lib/auth";
import { joinSecurityWaitlist } from "@/lib/actions";
import { isFeatureEnabled } from "@/config/features";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default async function SecurityVerticalPage() {
  let session: { user?: { role?: string } } | null = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  const enabled = isFeatureEnabled("securityVertical");

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 sm:px-6">
        <Badge tone="muted">Feature flag off</Badge>
        <h1 className="text-2xl font-semibold text-zinc-100">Security vertical</h1>
        <p className="text-sm text-zinc-500">
          Disabled via FEATURE_FLAGS. Code retained for future activation.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 sm:px-6">
      <Badge tone="warn">Phase 3 · Scaffold / waitlist</Badge>
      <h1 className="text-3xl font-semibold text-zinc-100">
        Security-adjacent services
      </h1>
      <p className="text-zinc-400 leading-relaxed">
        Concierge security, event security staffing, and vetted executive drivers
        require SIA-aware controls, elevated insurance, and tighter operational
        playbooks. This vertical is <strong>not live marketplace</strong> in the
        MVP — compliance matrix and waitlist only.
      </p>

      <Card>
        <CardHeader title="Required evidence (preview)" />
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            <li>Photo ID + right to work</li>
            <li>Proof of address</li>
            <li>Valid SIA licence (where role requires)</li>
            <li>Insurance cover</li>
            <li>Manual Trust &amp; Safety adjudication always</li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Join waitlist" />
        <CardBody className="space-y-3">
          {session?.user?.role === "PROVIDER" ? (
            <form action={joinSecurityWaitlist}>
              <button type="submit" className={buttonClass("primary", "md")}>
                Express interest (concierge security)
              </button>
            </form>
          ) : (
            <p className="text-sm text-zinc-400">
              <Link href="/login" className="underline">
                Sign in as a provider
              </Link>{" "}
              to join the security waitlist.
            </p>
          )}
          <p className="text-xs text-zinc-500">
            Not a licensed security employment agency product. Legal and
            operational controls required before go-live.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
