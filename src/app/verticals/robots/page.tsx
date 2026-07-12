import Link from "next/link";
import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/config/features";
import { joinRobotWaitlist } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default async function RobotsVerticalPage() {
  const session = await auth();
  const enabled = isFeatureEnabled("robotVertical");

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 sm:px-6">
        <Badge tone="muted">Feature flag off</Badge>
        <h1 className="text-2xl font-semibold text-zinc-100">Robot helpers</h1>
        <p className="text-sm text-zinc-500">
          Disabled via FEATURE_FLAGS. Code retained for future activation.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 sm:px-6">
      <Badge tone="gold">Robotics · AI safety + policy clearance</Badge>
      <h1 className="text-3xl font-semibold text-zinc-100">Robot helper services</h1>
      <p className="text-zinc-400 leading-relaxed">
        Deploy vetted robot helpers in personal homes, retail, commercial
        facilities, and (waitlist) care homes. Every robotics role requires{" "}
        <strong className="text-zinc-200">AI safety governance</strong>,{" "}
        <strong className="text-zinc-200">policy clearance</strong> for the
        deployment site, platform safety evidence, insurance, and human Trust
        &amp; Safety clearance. Operators remain accountable — robots are not
        auto-approved.
      </p>

      <Card>
        <CardHeader title="Deployment environments" />
        <CardBody>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>
              <strong className="text-zinc-100">Personal homes</strong> — home
              robot helper (ACTIVE)
            </li>
            <li>
              <strong className="text-zinc-100">Retail</strong> — floor assistant
              robots (ACTIVE)
            </li>
            <li>
              <strong className="text-zinc-100">Commercial / facilities</strong> —
              office &amp; facility robots (ACTIVE)
            </li>
            <li>
              <strong className="text-zinc-100">Care homes</strong> — support
              robots (WAITLIST · CRITICAL · safeguarding + DBS)
            </li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Required evidence (all robot roles)" />
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            <li>Photo ID + right to work + professional references</li>
            <li>AI safety governance pack (risk, fail-safes, human oversight)</li>
            <li>Site / venue policy clearance for the deployment environment</li>
            <li>Robot platform safety / conformity evidence</li>
            <li>Appropriate insurance</li>
            <li>Care homes only: Enhanced DBS + safeguarding (waitlist)</li>
            <li>Human Trust &amp; Safety CLEAR — no automated clearance</li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Apply or join care-home waitlist" />
        <CardBody className="space-y-3">
          {session?.user?.role === "PROVIDER" ? (
            <>
              <Link href="/provider/categories" className={buttonClass("primary", "md")}>
                Apply to robot categories
              </Link>
              <form action={joinRobotWaitlist}>
                <button type="submit" className={buttonClass("secondary", "md")}>
                  Express interest — care home robot support
                </button>
              </form>
            </>
          ) : (
            <p className="text-sm text-zinc-600">
              <Link href="/login" className="underline text-[#3dd6c6]">
                Sign in as a provider
              </Link>{" "}
              to apply for robot helper roles.
            </p>
          )}
          <p className="text-xs text-zinc-500">
            Not a CQC-registered care product. Policy clearance is site-specific.
            Aegis facilitates evidence and human review only.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
