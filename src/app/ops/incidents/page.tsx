import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { openIncident, resolveIncident } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const incidents = await db.incident.findMany({
    orderBy: { openedAt: "desc" },
    include: {
      provider: { include: { user: true } },
      openedBy: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Incidents</h1>

      <Card>
        <CardHeader title="Open incident" />
        <CardBody>
          <form action={openIncident} className="flex flex-wrap gap-2">
            <select
              name="severity"
              defaultValue="MED"
              className="rounded-xl border border-white/10 px-2 py-1.5 text-sm"
            >
              {["LOW", "MED", "HIGH", "CRITICAL"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              name="summary"
              required
              placeholder="Summary"
              className="min-w-[220px] flex-1 rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            />
            <button type="submit" className={buttonClass("primary", "sm")}>
              Open
            </button>
          </form>
        </CardBody>
      </Card>

      {incidents.map((i) => (
        <Card key={i.id}>
          <CardHeader
            title={i.summary}
            subtitle={`${formatDate(i.openedAt)}${i.openedBy ? ` · ${i.openedBy.name}` : ""}${i.provider ? ` · ${i.provider.user.name}` : ""}`}
            action={
              <div className="flex gap-1">
                <Badge
                  tone={
                    i.severity === "HIGH" || i.severity === "CRITICAL"
                      ? "danger"
                      : "warn"
                  }
                >
                  {i.severity}
                </Badge>
                <Badge tone="muted">{i.status}</Badge>
              </div>
            }
          />
          {i.status !== "RESOLVED" ? (
            <CardBody>
              <form action={resolveIncident} className="flex flex-wrap gap-2">
                <input type="hidden" name="incidentId" value={i.id} />
                <input
                  name="resolution"
                  required
                  placeholder="Resolution notes"
                  className="min-w-[200px] flex-1 rounded-xl border border-white/10 px-3 py-1.5 text-sm"
                />
                <button type="submit" className={buttonClass("secondary", "sm")}>
                  Resolve
                </button>
              </form>
            </CardBody>
          ) : (
            <CardBody>
              <p className="text-sm text-zinc-400">{i.resolution}</p>
            </CardBody>
          )}
        </Card>
      ))}
    </div>
  );
}
