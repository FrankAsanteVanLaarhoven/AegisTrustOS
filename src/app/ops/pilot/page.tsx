import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  logPilotInterview,
  updatePilotLeadStatus,
} from "@/lib/actions";
import { getPilotKpisFromDb } from "@/lib/services/pilot-service";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusStrip } from "@/components/layout/status-strip";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function pct(n: number | null) {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}

export default async function OpsPilotPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const sp = await searchParams;
  const [kpis, leads] = await Promise.all([
    getPilotKpisFromDb(),
    db.pilotLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <StatusStrip
        items={[
          {
            label: "Interviews",
            value: `${kpis.interviewsCompleted}/${kpis.targets.interviews}`,
            tone:
              kpis.interviewsCompleted >= kpis.targets.interviews
                ? "ok"
                : "warn",
          },
          {
            label: "Strong ≥7",
            value: pct(kpis.strongInterestRate),
            tone:
              (kpis.strongInterestRate ?? 0) >= kpis.targets.strongInterestRate
                ? "ok"
                : "warn",
          },
          {
            label: "Use case",
            value: pct(kpis.namedUseCaseRate),
            tone:
              (kpis.namedUseCaseRate ?? 0) >= kpis.targets.namedUseCaseRate
                ? "ok"
                : "warn",
          },
          {
            label: "Go signal",
            value: kpis.goSignal ? "YES" : "NO",
            tone: kpis.goSignal ? "ok" : "warn",
          },
          {
            label: "Warm intros",
            value: String(kpis.warmIntrosTotal),
            tone: "ok",
          },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e87722]">
            London pilot · Demand validation
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Pilot pipeline
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Capture sheet aligned to DEMAND_VALIDATION: interest 1–10, named
            30-day use case, pilot Y/N. Go signal = ≥10 interviews and ≥70%
            strong interest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ops" className={buttonClass("ghost", "sm")}>
            T&amp;S home
          </Link>
          <a
            href="/api/v1/ops/pilot/export"
            className={buttonClass("secondary", "sm")}
          >
            Export CSV
          </a>
          <Link href="/pilot" className={buttonClass("secondary", "sm")}>
            Public form
          </Link>
        </div>
      </div>

      {sp.saved ? (
        <p className="text-sm text-[#3dd6c6]">Interview saved.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total leads", kpis.totalLeads],
          ["Public interest", kpis.publicInterest],
          ["Supply", kpis.supplyLeads],
          ["Agency", kpis.agencyLeads],
          ["Interviews", kpis.interviewsCompleted],
          ["Strong interest", kpis.strongInterestCount],
          ["Pilot yes", kpis.pilotYesCount],
          ["Warm intros", kpis.warmIntrosTotal],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardBody>
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Log interview"
          subtitle="20-minute demand script capture"
        />
        <CardBody>
          <form
            action={logPilotInterview}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <label className="block text-sm">
              <span className="text-zinc-400">Name</span>
              <input
                name="name"
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Email</span>
              <input
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Organisation</span>
              <input
                name="organisation"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Persona</span>
              <select
                name="persona"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
                defaultValue="EA / chief of staff"
              >
                <option>EA / chief of staff</option>
                <option>Family office / household</option>
                <option>UHNW principal</option>
                <option>Boutique agency</option>
                <option>Other</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Interest 1–10</span>
              <input
                name="interestScore"
                type="number"
                min={1}
                max={10}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Pilot willing</span>
              <select
                name="pilotWilling"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Trust incident Y/N</span>
              <select
                name="trustIncident"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Warm intros (#)</span>
              <input
                name="warmIntros"
                type="number"
                min={0}
                defaultValue={0}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2 lg:col-span-1">
              <span className="text-zinc-400">Categories (comma)</span>
              <input
                name="categories"
                placeholder="PA, chauffeur"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2 lg:col-span-3">
              <span className="text-zinc-400">Named next-30-day use case</span>
              <input
                name="nextUseCase"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2 lg:col-span-3">
              <span className="text-zinc-400">WTP notes</span>
              <input
                name="wtpNotes"
                placeholder="Membership / take-rate / placement fee…"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2 lg:col-span-3">
              <span className="text-zinc-400">Top pains (one per line)</span>
              <textarea
                name="pains"
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-400">Objections</span>
              <input
                name="objections"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Notes</span>
              <input
                name="notes"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0e1218] px-3 py-2 text-sm"
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <button type="submit" className={buttonClass("primary", "sm")}>
                Save interview
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Pipeline" subtitle={`${leads.length} recent leads`} />
        <CardBody>
          <ul className="divide-y divide-white/[0.06]">
            {leads.map((l) => (
              <li
                key={l.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-100">
                    {l.name}{" "}
                    <span className="font-mono text-[10px] text-zinc-500">
                      {l.email}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {l.kind} · {l.persona ?? "—"} · {l.organisation ?? "—"} ·{" "}
                    {formatDate(l.createdAt)}
                    {l.interestScore != null
                      ? ` · interest ${l.interestScore}/10`
                      : ""}
                    {l.nextUseCase ? ` · “${l.nextUseCase.slice(0, 48)}”` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      l.status === "PILOT_YES"
                        ? "success"
                        : l.status === "NEW"
                          ? "gold"
                          : "muted"
                    }
                  >
                    {l.status}
                  </Badge>
                  <form action={updatePilotLeadStatus} className="flex gap-1">
                    <input type="hidden" name="id" value={l.id} />
                    <select
                      name="status"
                      defaultValue={l.status}
                      className="rounded-lg border border-white/10 bg-[#0e1218] px-2 py-1 text-[10px] font-mono"
                    >
                      {(
                        [
                          "NEW",
                          "CONTACTED",
                          "INTERVIEWED",
                          "PILOT_YES",
                          "PILOT_NO",
                          "NURTURE",
                          "CLOSED",
                        ] as const
                      ).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className={buttonClass("ghost", "sm")}
                    >
                      Set
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {!leads.length ? (
              <li className="py-6 text-sm text-zinc-500">
                No leads yet. Share /pilot or log an interview above.
              </li>
            ) : null}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
