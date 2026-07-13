import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  shortlistMatch,
  createAndSignContracts,
  requestCarerApprovalAction,
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
      careHousehold: true,
      matches: {
        orderBy: { score: "desc" },
        include: {
          provider: {
            include: {
              user: true,
              passport: true,
              carerApprovals: true,
            },
          },
        },
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
          {req.category.requiresFamilyApproval ? (
            <Badge tone="warn">family approval required</Badge>
          ) : null}
          {req.category.nhsHomePathway ? (
            <Badge tone="gold">NHS home pathway context</Badge>
          ) : null}
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-100">{req.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {req.location}
          {req.area ? ` · ${req.area}` : ""} · {formatDate(req.startAt)}
          {req.careHousehold
            ? ` · Household: ${req.careHousehold.recipientName}`
            : ""}
        </p>
        <p className="mt-4 text-zinc-300 leading-relaxed">{req.brief}</p>
      </div>

      {req.category.requiresFamilyApproval ? (
        <p className="rounded-lg border border-[#e87722]/25 bg-[rgba(232,119,34,0.06)] px-4 py-3 text-xs text-zinc-400">
          Security is approved by the family/recipient for this household. Approve
          a carer in{" "}
          <Link href="/client/care" className="text-[#3dd6c6] underline">
            Care circle
          </Link>{" "}
          before “Sign NDA + engage”. Dual-control Trust &amp; Safety clearance
          still applies.
        </p>
      ) : null}

      <Card>
        <CardHeader
          title="Explainable shortlist"
          subtitle="Verified carers with match reasons. Family approval is a separate security gate."
        />
        <CardBody className="space-y-4">
          {req.matches.map((m) => {
            const reasons = parseJsonArray(m.reasonsJson);
            const approval = req.careHouseholdId
              ? m.provider.carerApprovals.find(
                  (a) => a.householdId === req.careHouseholdId,
                )
              : null;
            const familyOk = !req.category.requiresFamilyApproval
              ? true
              : approval?.status === "APPROVED";

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
                      {m.provider.passport
                        ? ` · ${m.provider.passport.passportNumber}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={m.status === "ACCEPTED" ? "success" : "muted"}>
                      {m.status}
                    </Badge>
                    {req.category.requiresFamilyApproval ? (
                      <Badge
                        tone={
                          approval?.status === "APPROVED"
                            ? "success"
                            : approval?.status === "PENDING"
                              ? "warn"
                              : "danger"
                        }
                      >
                        family: {approval?.status ?? "NOT_REQUESTED"}
                      </Badge>
                    ) : null}
                  </div>
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
                    {req.category.requiresFamilyApproval &&
                    req.careHouseholdId &&
                    approval?.status !== "APPROVED" ? (
                      <form action={requestCarerApprovalAction}>
                        <input
                          type="hidden"
                          name="householdId"
                          value={req.careHouseholdId}
                        />
                        <input
                          type="hidden"
                          name="providerId"
                          value={m.providerId}
                        />
                        <button type="submit" className={buttonClass("secondary", "sm")}>
                          Request family approval
                        </button>
                      </form>
                    ) : null}
                    <form action={createAndSignContracts}>
                      <input type="hidden" name="requestId" value={req.id} />
                      <input type="hidden" name="providerId" value={m.providerId} />
                      <button
                        type="submit"
                        className={buttonClass("primary", "sm")}
                        disabled={!familyOk}
                        title={
                          familyOk
                            ? undefined
                            : "Approve carer in Care circle first"
                        }
                      >
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
              No verified providers matched. Clear carers via ops, then request
              family approval.
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
