import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  shortlistMatch,
  createAndSignContracts,
} from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate, parseJsonArray } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const req = await db.serviceRequest.findUnique({
    where: { id },
    include: {
      client: true,
      category: true,
      matches: {
        orderBy: { score: "desc" },
        include: { provider: { include: { user: true } } },
      },
      contracts: true,
      bookings: true,
    },
  });

  if (!req) notFound();
  if (
    session.user.role === "CLIENT" &&
    req.client.userId !== session.user.id
  ) {
    redirect("/client");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="navy">{req.status}</Badge>
          <Badge tone="muted">{req.category.name}</Badge>
          <Badge tone="gold">Min {req.minTrustTier}</Badge>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-100">{req.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {req.location}
          {req.area ? ` · ${req.area}` : ""} · {formatDate(req.startAt)}
        </p>
        <p className="mt-4 text-zinc-300 leading-relaxed">{req.brief}</p>
      </div>

      <Card>
        <CardHeader
          title="Explainable shortlist"
          subtitle="Hard filters (verified, tier, geo) + soft rank with reasons. Not a black box."
        />
        <CardBody className="space-y-4">
          {req.matches.map((m) => {
            const reasons = parseJsonArray(m.reasonsJson);
            return (
              <div
                key={m.id}
                className="rounded-xl border border-white/[0.06] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-100">
                      {m.provider.user.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Score {m.score} · Advisory risk {m.provider.riskScore}/100 ·{" "}
                      {m.provider.city}
                    </p>
                  </div>
                  <Badge tone={m.status === "ACCEPTED" ? "success" : "muted"}>
                    {m.status}
                  </Badge>
                </div>
                <ul className="mt-2 list-disc pl-5 text-xs text-zinc-400">
                  {reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {session.user.role === "CLIENT" &&
                m.status !== "ACCEPTED" &&
                !req.bookings.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={shortlistMatch}>
                      <input type="hidden" name="matchId" value={m.id} />
                      <button type="submit" className={buttonClass("secondary", "sm")}>
                        Shortlist
                      </button>
                    </form>
                    <form action={createAndSignContracts}>
                      <input type="hidden" name="requestId" value={req.id} />
                      <input type="hidden" name="providerId" value={m.providerId} />
                      <button type="submit" className={buttonClass("primary", "sm")}>
                        Sign NDA + engage
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!req.matches.length ? (
            <p className="text-sm text-zinc-500">
              No verified providers matched. Ops can place manually later.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {req.contracts.length ? (
        <Card>
          <CardHeader title="Contracts" />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {req.contracts.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between rounded-lg border border-white/[0.06] px-3 py-2"
                >
                  <span>
                    {c.type} · {c.templateKey}
                  </span>
                  <Badge tone="success">{c.status}</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
