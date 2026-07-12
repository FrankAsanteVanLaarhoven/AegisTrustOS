import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

const steps = [
  "Complete your profile (London area recommended for pilot).",
  "Add ID, right-to-work, and two references to your wallet.",
  "Run mock IDV / liveness.",
  "Apply to an active concierge category.",
  "Wait for Trust & Safety human review — AI only advises.",
  "Once verified, you appear in explainable match shortlists.",
];

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Provider onboarding</h1>
      <Card>
        <CardBody>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-zinc-300">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/provider" className={buttonClass("primary", "sm")}>
              Dashboard
            </Link>
            <Link href="/provider/wallet" className={buttonClass("secondary", "sm")}>
              Wallet
            </Link>
            <Link href="/provider/categories" className={buttonClass("secondary", "sm")}>
              Categories
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
