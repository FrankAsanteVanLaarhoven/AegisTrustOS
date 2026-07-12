import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scheduleVerificationInterview, trustDecision } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AegisPassportCard } from "@/components/trust/AegisPassportCard";
import { formatDate, parseJsonObject } from "@/lib/utils";
import {
  evaluateChecklist,
  type ChecklistItem,
} from "@/lib/compliance/matrix";

export const dynamic = "force-dynamic";

export default async function OpsProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const provider = await db.providerProfile.findUnique({
    where: { id },
    include: {
      user: true,
      credentials: true,
      categories: { include: { category: true } },
      trustReviews: {
        orderBy: { createdAt: "desc" },
        include: { reviewer: true },
      },
      idvChecks: { orderBy: { createdAt: "desc" }, take: 5 },
      passport: true,
      interviews: { orderBy: { scheduledAt: "desc" }, take: 5 },
    },
  });
  if (!provider) notFound();

  const defaultInterview = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const interviewLocal = new Date(
    defaultInterview.getTime() - defaultInterview.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          {provider.user.name}
        </h1>
        <p className="text-sm text-zinc-500">
          {provider.user.email} · {provider.city}
          {provider.area ? ` · ${provider.area}` : ""} · Advisory risk{" "}
          {provider.riskScore}/100
        </p>
        <div className="mt-2 flex gap-2">
          <Badge tone="navy">{provider.overallStatus}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader title="Bio" />
        <CardBody>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">
            {provider.bio || "—"}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Credential wallet" />
        <CardBody>
          <ul className="divide-y divide-slate-100">
            {provider.credentials.map((c) => (
              <li key={c.id} className="flex justify-between py-2 text-sm">
                <span>
                  <strong>{c.type}</strong> — {c.title}
                  {c.number ? ` (${c.number})` : ""}
                </span>
                <Badge
                  tone={
                    c.verificationStatus === "VERIFIED"
                      ? "success"
                      : c.verificationStatus === "AI_FLAGGED"
                        ? "warn"
                        : "muted"
                  }
                >
                  {c.verificationStatus}
                </Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Categories & compliance checklist" />
        <CardBody className="space-y-4">
          {provider.categories.map((pc) => {
            const checklist = JSON.parse(
              pc.category.checklistJson || "[]",
            ) as ChecklistItem[];
            const results = evaluateChecklist(checklist, provider.credentials);
            const ai = parseJsonObject<{
              signals?: { severity: string; message: string; code: string }[];
              disclaimer?: string;
            }>(pc.aiSignalsJson);

            return (
              <div key={pc.id} className="rounded-xl border border-white/[0.06] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-zinc-100">{pc.category.name}</p>
                  <Badge tone="muted">{pc.status}</Badge>
                  <Badge tone="gold">{pc.trustTier}</Badge>
                </div>
                <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                  {results.map((r) => (
                    <li
                      key={r.label}
                      className={r.satisfied ? "text-[#3fb950]" : "text-[#f85149]"}
                    >
                      {r.satisfied ? "✓" : "✗"} {r.label}
                    </li>
                  ))}
                </ul>
                {ai.signals?.length ? (
                  <div className="mt-3 rounded-lg bg-[rgba(232,119,34,0.1)] p-3 text-xs text-[#e87722]">
                    <p className="font-medium">AI advisory signals</p>
                    <ul className="mt-1 list-disc pl-4">
                      {ai.signals.map((s) => (
                        <li key={s.code + s.message}>
                          [{s.severity}] {s.message}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 italic opacity-80">
                      {ai.disclaimer ??
                        "Advisory only. Human adjudication required."}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!provider.categories.length ? (
            <p className="text-sm text-zinc-500">No category applications.</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="IDV checks" />
        <CardBody>
          <ul className="space-y-2 text-sm">
            {provider.idvChecks.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>
                  {c.vendor} · {formatDate(c.completedAt)} · liveness{" "}
                  {c.livenessScore ?? "—"}
                </span>
                <Badge tone={c.status === "PASSED" ? "success" : "warn"}>
                  {c.status}
                </Badge>
              </li>
            ))}
            {!provider.idvChecks.length ? (
              <li className="text-zinc-500">None</li>
            ) : null}
          </ul>
        </CardBody>
      </Card>

      {provider.passport ? (
        <AegisPassportCard
          passport={provider.passport}
          providerName={provider.user.name}
          city={provider.city}
        />
      ) : null}

      <Card>
        <CardHeader
          title="Live verification interview"
          subtitle="Face-to-face confidence check before clearance"
        />
        <CardBody className="space-y-4">
          <form action={scheduleVerificationInterview} className="flex flex-wrap gap-2">
            <input type="hidden" name="providerId" value={provider.id} />
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              defaultValue={interviewLocal}
              className="rounded-md border border-white/10 bg-[#141a22] px-3 py-1.5 text-sm"
            />
            <input
              name="notes"
              placeholder="Brief for interview"
              className="min-w-[160px] flex-1 rounded-md border border-white/10 bg-[#141a22] px-3 py-1.5 text-sm"
            />
            <button type="submit" className={buttonClass("secondary", "sm")}>
              Schedule &amp; open room
            </button>
          </form>
          <ul className="space-y-2 text-sm">
            {provider.interviews.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/[0.06] px-3 py-2"
              >
                <span className="text-zinc-400">
                  {formatDate(i.scheduledAt)} · {i.status} · {i.outcome}
                </span>
                <Link
                  href={`/verify/room/${i.roomCode}`}
                  className="text-[#3dd6c6] hover:underline"
                >
                  Open room
                </Link>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Human decision"
          subtitle="Only path to VERIFIED. CRITICAL categories require two distinct OPS reviewers (dual control)."
        />
        <CardBody>
          <form action={trustDecision} className="space-y-3">
            <input type="hidden" name="providerId" value={provider.id} />
            <label className="block text-sm">
              <span className="text-zinc-400">Category (optional scope)</span>
              <select
                name="categorySlug"
                className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
                defaultValue={provider.categories[0]?.category.slug ?? ""}
              >
                <option value="">All submitted / in review</option>
                {provider.categories.map((c) => (
                  <option key={c.id} value={c.category.slug}>
                    {c.category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-zinc-400">Decision</span>
                <select
                  name="decision"
                  required
                  defaultValue="CLEAR"
                  className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
                >
                  <option value="CLEAR">CLEAR</option>
                  <option value="REQUEST_MORE">REQUEST_MORE</option>
                  <option value="WAITLIST">WAITLIST</option>
                  <option value="REJECT">REJECT</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">Trust tier (on CLEAR)</span>
                <select
                  name="trustTier"
                  defaultValue="T2"
                  className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
                >
                  <option value="T1">T1</option>
                  <option value="T2">T2</option>
                  <option value="T3">T3</option>
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-zinc-400">Rationale (required, audited)</span>
              <textarea
                name="rationale"
                required
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
                placeholder="Evidence reviewed, residual risks, conditions…"
              />
            </label>
            <button type="submit" className={buttonClass("primary", "md")}>
              Record decision
            </button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Prior reviews" />
        <CardBody>
          <ul className="space-y-3 text-sm">
            {provider.trustReviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-white/[0.06] p-3">
                <div className="flex justify-between">
                  <Badge tone="navy">{r.decision}</Badge>
                  <span className="text-xs text-zinc-500">
                    {r.reviewer.name} · {formatDate(r.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-zinc-300">{r.rationale}</p>
              </li>
            ))}
            {!provider.trustReviews.length ? (
              <li className="text-zinc-500">No reviews yet.</li>
            ) : null}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
