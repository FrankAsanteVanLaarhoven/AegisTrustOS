import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listExpiringCredentials } from "@/lib/services/expiry-service";
import { runExpirySweepAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OpsExpiryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const rows = await listExpiringCredentials(90);
  const now = Date.now();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e87722]">
            Trust hygiene
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Credential expiry
          </h1>
          <p className="text-sm text-zinc-500">
            Next 90 days + already expired. Sweep marks expired, notifies
            providers, and suspends passports with lapsed evidence.
          </p>
        </div>
        <form action={runExpirySweepAction}>
          <button type="submit" className={buttonClass("primary", "sm")}>
            Run expiry sweep
          </button>
        </form>
      </div>

      <Card>
        <CardHeader title={`${rows.length} credential(s)`} />
        <CardBody>
          <ul className="divide-y divide-white/[0.06] text-sm">
            {rows.map((c) => {
              const expired =
                c.expiresAt && c.expiresAt.getTime() <= now;
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium text-zinc-100">
                      {c.provider.user.name} — {c.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {c.type} · {formatDate(c.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={expired ? "danger" : "warn"}>
                      {expired ? "EXPIRED" : c.verificationStatus}
                    </Badge>
                    <Link
                      href={`/ops/providers/${c.providerId}`}
                      className="text-xs text-[#3dd6c6] hover:underline"
                    >
                      Review
                    </Link>
                  </div>
                </li>
              );
            })}
            {!rows.length ? (
              <li className="py-4 text-zinc-500">No expiring credentials.</li>
            ) : null}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
