import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusStrip } from "@/components/layout/status-strip";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OpsDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [queue, incidents, expiring] = await Promise.all([
    db.providerProfile.findMany({
      where: {
        OR: [
          { overallStatus: { in: ["SUBMITTED", "IN_REVIEW"] } },
          {
            categories: {
              some: { status: { in: ["SUBMITTED", "IN_REVIEW", "WAITLIST"] } },
            },
          },
        ],
      },
      include: {
        user: true,
        categories: { include: { category: true } },
        credentials: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.incident.findMany({
      where: { status: { in: ["OPEN", "INVESTIGATING", "ESCALATED"] } },
      orderBy: { openedAt: "desc" },
      take: 10,
    }),
    db.credential.findMany({
      where: {
        expiresAt: {
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
      include: { provider: { include: { user: true } } },
      take: 10,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <StatusStrip
        items={[
          {
            label: "Queue",
            value: String(queue.length),
            tone: queue.length ? "warn" : "ok",
          },
          {
            label: "Incidents",
            value: String(incidents.length),
            tone: incidents.length ? "danger" : "ok",
          },
          {
            label: "Expiring",
            value: String(expiring.length),
            tone: expiring.length ? "warn" : "ok",
          },
          { label: "Channel", value: "SECURE", tone: "ok" },
          { label: "Audit", value: "LIVE", tone: "ok" },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e87722]">
            Command · Trust &amp; Safety
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Aegis Trust &amp; Safety
          </h1>
          <p className="text-sm text-zinc-500">
            Human adjudication required. AI signals are advisory only. IDV
            vendors supply base checks — Aegis owns vertical clearance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ops/kpis" className={buttonClass("secondary", "sm")}>
            KPIs
          </Link>
          <Link href="/ops/incidents" className={buttonClass("secondary", "sm")}>
            Incidents
          </Link>
          <Link href="/ops/playbook" className={buttonClass("secondary", "sm")}>
            Playbook
          </Link>
          <Link href="/ops/audit" className={buttonClass("ghost", "sm")}>
            Audit log
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Review queue"
            subtitle={`${queue.length} provider(s) need attention`}
          />
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {queue.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link
                      href={`/ops/providers/${p.id}`}
                      className="font-medium text-zinc-100 hover:underline"
                    >
                      {p.user.name}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      Risk {p.riskScore} · {p.credentials.length} credentials ·{" "}
                      {p.categories.map((c) => c.category.slug).join(", ") || "no cats"}
                    </p>
                  </div>
                  <Badge
                    tone={
                      p.overallStatus === "IN_REVIEW" ? "warn" : "muted"
                    }
                  >
                    {p.overallStatus}
                  </Badge>
                </li>
              ))}
              {!queue.length ? (
                <li className="text-sm text-zinc-500 py-4">Queue clear.</li>
              ) : null}
            </ul>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Open incidents" />
            <CardBody>
              <ul className="space-y-2 text-sm">
                {incidents.map((i) => (
                  <li key={i.id} className="rounded-lg border border-white/[0.06] p-2">
                    <Badge
                      tone={
                        i.severity === "CRITICAL" || i.severity === "HIGH"
                          ? "danger"
                          : "warn"
                      }
                    >
                      {i.severity}
                    </Badge>
                    <p className="mt-1 text-zinc-300">{i.summary}</p>
                  </li>
                ))}
                {!incidents.length ? (
                  <li className="text-zinc-500">None open.</li>
                ) : null}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Expiring credentials (90d)" />
            <CardBody>
              <ul className="space-y-2 text-xs text-zinc-400">
                {expiring.map((c) => (
                  <li key={c.id}>
                    {c.provider.user.name}: {c.title} ·{" "}
                    {formatDate(c.expiresAt)}
                  </li>
                ))}
                {!expiring.length ? <li>None soon.</li> : null}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
