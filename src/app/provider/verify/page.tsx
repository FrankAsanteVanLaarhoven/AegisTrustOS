import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { VerifyClient } from "./verify-client";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProviderVerifyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROVIDER") redirect("/");

  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      idvChecks: { orderBy: { createdAt: "desc" }, take: 5 },
      passport: true,
      interviews: { orderBy: { scheduledAt: "desc" }, take: 5 },
    },
  });
  if (!profile) redirect("/provider");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e87722]">
          Identity channel
        </p>
        <h1 className="text-2xl font-semibold text-zinc-100">Verify identity</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Camera ID capture and liveness on-site. Full clearance still requires
          human Trust &amp; Safety review.
        </p>
      </div>

      <Card>
        <CardHeader title="Live capture" subtitle="Consent required · one-time camera use" />
        <CardBody>
          <VerifyClient />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="IDV history" />
        <CardBody>
          <ul className="space-y-2 text-sm">
            {profile.idvChecks.map((c) => (
              <li
                key={c.id}
                className="flex justify-between rounded-lg border border-white/[0.06] px-3 py-2"
              >
                <span className="text-zinc-400">
                  {c.vendor} · {formatDate(c.completedAt ?? c.createdAt)}
                  {c.livenessScore != null
                    ? ` · liveness ${c.livenessScore.toFixed(2)}`
                    : ""}
                </span>
                <Badge tone={c.status === "PASSED" ? "success" : "warn"}>
                  {c.status}
                </Badge>
              </li>
            ))}
            {!profile.idvChecks.length ? (
              <li className="text-zinc-500">No checks yet.</li>
            ) : null}
          </ul>
        </CardBody>
      </Card>

      {profile.interviews.length ? (
        <Card>
          <CardHeader title="Verification interviews" />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {profile.interviews.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-3 py-2"
                >
                  <span className="text-zinc-400">
                    {formatDate(i.scheduledAt)} · {i.status}
                  </span>
                  <a
                    href={`/verify/room/${i.roomCode}`}
                    className="text-[#3dd6c6] hover:underline"
                  >
                    Join room
                  </a>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
