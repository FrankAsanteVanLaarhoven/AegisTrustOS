import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { completeInterview, markInterviewLive } from "@/lib/actions";
import { buttonClass } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VerifyRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/verify/room/${code}`);

  const interview = await db.verificationInterview.findUnique({
    where: { roomCode: code },
    include: {
      provider: { include: { user: true } },
    },
  });
  if (!interview) notFound();

  const isOps =
    session.user.role === "OPS" || session.user.role === "ADMIN";
  const isProvider =
    session.user.role === "PROVIDER" &&
    (await db.providerProfile.findFirst({
      where: { userId: session.user.id, id: interview.providerId },
    }));

  if (!isOps && !isProvider) redirect("/");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e87722]">
          Live verification interview
        </p>
        <h1 className="text-2xl font-semibold text-zinc-100">
          Room {interview.roomCode}
        </h1>
        <p className="text-sm text-zinc-500">
          {interview.provider.user.name} · scheduled{" "}
          {formatDate(interview.scheduledAt)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#141a22] to-black">
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Local
            </p>
            <p className="mt-2 text-sm text-zinc-400">{session.user.name}</p>
            <p className="mt-4 text-xs text-zinc-600">
              Secure video channel (embedded room)
            </p>
          </div>
        </div>
        <div className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#0e1218] to-black">
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Remote
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {isOps ? interview.provider.user.name : "Trust & Safety reviewer"}
            </p>
            <Badge tone="navy" className="mt-3">
              {interview.status}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Session controls"
          subtitle="Outcome feeds clearance confidence — human CLEAR still required"
        />
        <CardBody className="space-y-4">
          {interview.notes ? (
            <p className="text-sm text-zinc-400">{interview.notes}</p>
          ) : null}

          {isOps && interview.status !== "COMPLETED" ? (
            <div className="flex flex-wrap gap-2">
              <form action={markInterviewLive}>
                <input type="hidden" name="interviewId" value={interview.id} />
                <button type="submit" className={buttonClass("secondary", "sm")}>
                  Mark live
                </button>
              </form>
              <form action={completeInterview} className="flex flex-wrap gap-2">
                <input type="hidden" name="interviewId" value={interview.id} />
                <select
                  name="outcome"
                  className="rounded-md border border-white/10 bg-[#141a22] px-2 py-1.5 text-sm"
                  defaultValue="PROCEED_CLEAR"
                >
                  <option value="PROCEED_CLEAR">Proceed to CLEAR</option>
                  <option value="REQUEST_MORE">Request more evidence</option>
                  <option value="REJECT_RECOMMEND">Recommend reject</option>
                </select>
                <input
                  name="notes"
                  placeholder="Interview notes"
                  className="min-w-[180px] flex-1 rounded-md border border-white/10 bg-[#141a22] px-3 py-1.5 text-sm"
                />
                <button type="submit" className={buttonClass("primary", "sm")}>
                  Complete interview
                </button>
              </form>
            </div>
          ) : null}

          {interview.status === "COMPLETED" ? (
            <p className="text-sm text-[#3fb950]">
              Completed · outcome {interview.outcome}
            </p>
          ) : null}

          <p className="text-[10px] text-zinc-600">
            Video is for verification confidence only. Recording requires
            separate consent and is not stored by default in this release.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
