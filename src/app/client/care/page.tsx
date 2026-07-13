import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addCareCircleMemberAction,
  createCareHouseholdAction,
  decideCarerApprovalAction,
  requestCarerApprovalAction,
} from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate, parseJsonArray } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientCarePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/");

  const client = await db.clientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!client) redirect("/client");

  const households = await db.careHousehold.findMany({
    where: { ownerClientId: client.id },
    include: {
      members: true,
      approvals: {
        include: { provider: { include: { user: true, passport: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const verifiedCarers = await db.providerProfile.findMany({
    where: {
      overallStatus: "VERIFIED",
      categories: {
        some: {
          status: "VERIFIED",
          category: { phase: "CARE", mode: "ACTIVE" },
        },
      },
    },
    include: {
      user: true,
      categories: { include: { category: true } },
    },
    take: 30,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e87722]">
          Family security · NHS home pathway context
        </p>
        <h1 className="text-2xl font-semibold text-zinc-100">Care circle</h1>
        <p className="mt-1 text-sm text-zinc-500 max-w-2xl">
          Connect families and carers for care at home — companionship, learning
          disability support, complex care, and family carers.{" "}
          <strong className="text-zinc-300">You approve who may support your household</strong>
          . Aegis is not an NHS service and not CQC-registered; we facilitate
          evidence, dual-control clearance, and your security decisions.
        </p>
      </div>

      <Card>
        <CardHeader title="Create household / recipient" />
        <CardBody>
          <form action={createCareHouseholdAction} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-500">Person receiving support</span>
              <input
                name="recipientName"
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
                placeholder="Full name"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Household label</span>
              <input
                name="label"
                defaultValue="Home"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">City</span>
              <input
                name="city"
                defaultValue="London"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-500">Needs tags (comma-separated)</span>
              <input
                name="needsTags"
                placeholder="companionship, learning_disability, complex"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-500">Summary</span>
              <textarea
                name="needsSummary"
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
                placeholder="What support is needed at home?"
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className={buttonClass("primary", "sm")}>
                Create household
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      {households.map((hh) => (
        <Card key={hh.id}>
          <CardHeader
            title={`${hh.recipientName} · ${hh.label}`}
            subtitle={`${hh.city}${hh.needsSummary ? ` · ${hh.needsSummary}` : ""}`}
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-1">
              {parseJsonArray(hh.needsTagsJson).map((t) => (
                <Badge key={t} tone="navy">
                  {t}
                </Badge>
              ))}
              <Badge tone="gold">family approval required</Badge>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Care circle
              </p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                {hh.members.map((m) => (
                  <li key={m.id}>
                    {m.name} · {m.role}
                    {m.canApprove ? " · can approve" : ""}
                    {m.email ? ` · ${m.email}` : ""}
                  </li>
                ))}
              </ul>
              <form
                action={addCareCircleMemberAction}
                className="mt-3 flex flex-wrap gap-2"
              >
                <input type="hidden" name="householdId" value={hh.id} />
                <input
                  name="name"
                  required
                  placeholder="Family / advocate name"
                  className="rounded-md border border-white/10 bg-[#141a22] px-2 py-1.5 text-sm"
                />
                <input
                  name="email"
                  placeholder="email"
                  className="rounded-md border border-white/10 bg-[#141a22] px-2 py-1.5 text-sm"
                />
                <select
                  name="role"
                  className="rounded-md border border-white/10 bg-[#141a22] px-2 py-1.5 text-sm"
                  defaultValue="FAMILY"
                >
                  <option value="FAMILY">FAMILY</option>
                  <option value="ADVOCATE">ADVOCATE</option>
                  <option value="NEXT_OF_KIN">NEXT_OF_KIN</option>
                </select>
                <button type="submit" className={buttonClass("secondary", "sm")}>
                  Add to circle
                </button>
              </form>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Carer security approvals
              </p>
              <ul className="mt-2 space-y-2">
                {hh.approvals.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-zinc-100">{a.provider.user.name}</p>
                      <p className="text-xs text-zinc-500">
                        {a.decidedAt ? formatDate(a.decidedAt) : "awaiting decision"}
                        {a.provider.passport
                          ? ` · Passport ${a.provider.passport.passportNumber}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          a.status === "APPROVED"
                            ? "success"
                            : a.status === "PENDING"
                              ? "warn"
                              : "danger"
                        }
                      >
                        {a.status}
                      </Badge>
                      {a.status === "PENDING" ? (
                        <>
                          <form action={decideCarerApprovalAction}>
                            <input type="hidden" name="approvalId" value={a.id} />
                            <input type="hidden" name="decision" value="APPROVED" />
                            <button
                              type="submit"
                              className={buttonClass("primary", "sm")}
                            >
                              Approve
                            </button>
                          </form>
                          <form action={decideCarerApprovalAction}>
                            <input type="hidden" name="approvalId" value={a.id} />
                            <input type="hidden" name="decision" value="DECLINED" />
                            <button
                              type="submit"
                              className={buttonClass("danger", "sm")}
                            >
                              Decline
                            </button>
                          </form>
                        </>
                      ) : null}
                      {a.status === "APPROVED" ? (
                        <form action={decideCarerApprovalAction}>
                          <input type="hidden" name="approvalId" value={a.id} />
                          <input type="hidden" name="decision" value="REVOKED" />
                          <button
                            type="submit"
                            className={buttonClass("ghost", "sm")}
                          >
                            Revoke
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
                {!hh.approvals.length ? (
                  <li className="text-xs text-zinc-600">No approval requests yet.</li>
                ) : null}
              </ul>

              <form
                action={requestCarerApprovalAction}
                className="mt-3 flex flex-wrap gap-2"
              >
                <input type="hidden" name="householdId" value={hh.id} />
                <select
                  name="providerId"
                  required
                  className="min-w-[200px] flex-1 rounded-md border border-white/10 bg-[#141a22] px-2 py-1.5 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select cleared carer…
                  </option>
                  {verifiedCarers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user.name} ·{" "}
                      {p.categories
                        .filter((c) => c.category.phase === "CARE")
                        .map((c) => c.category.name)
                        .join(", ")}
                    </option>
                  ))}
                </select>
                <button type="submit" className={buttonClass("secondary", "sm")}>
                  Request approval
                </button>
              </form>
            </div>

            <Link
              href={`/client/requests/new?household=${hh.id}`}
              className={buttonClass("primary", "sm")}
            >
              Request care for this household
            </Link>
          </CardBody>
        </Card>
      ))}

      {!households.length ? (
        <p className="text-sm text-zinc-500">
          Create a household to start family-approved care matching.
        </p>
      ) : null}

      <p className="text-[10px] text-zinc-600 leading-relaxed">
        Disclaimer: Aegis facilitates identity evidence, dual-control Trust &amp;
        Safety clearance, and family/recipient carer approvals. It is not an NHS
        organisation, not a local authority, and not a CQC-registered care
        provider. Clinical accountability remains with registered professionals
        and commissioning arrangements (e.g. personal health budgets) where they
        apply.
      </p>
    </div>
  );
}
