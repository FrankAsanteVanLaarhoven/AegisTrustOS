import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadKpis } from "@/lib/kpi/from-db";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function KpisPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const kpis = await loadKpis();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Pilot KPIs</h1>
        <p className="text-sm text-zinc-500">
          Computed from database events — not synthetic telemetry. Pilot targets
          shown for orientation.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.key}>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-400">{k.label}</p>
                {k.onTrack === true ? (
                  <Badge tone="success">On track</Badge>
                ) : k.onTrack === false ? (
                  <Badge tone="warn">Off track</Badge>
                ) : (
                  <Badge tone="muted">Track</Badge>
                )}
              </div>
              <p className="text-3xl font-semibold text-zinc-100">
                {k.value == null ? "—" : k.value}
                <span className="ml-1 text-sm font-normal text-zinc-500">
                  {k.unit}
                </span>
              </p>
              <p className="text-xs text-zinc-500">Target: {k.target}</p>
              {k.detail ? (
                <p className="text-xs text-zinc-500">{k.detail}</p>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Definitions" />
        <CardBody className="prose-aegis text-sm">
          <ul>
            <li>Vetting time: TrustReview CLEAR − first category submittedAt</li>
            <li>Booking success: COMPLETED bookings / non-draft requests</li>
            <li>Repeat engagement: clients with ≥2 bookings / clients with bookings</li>
            <li>Incident rate: incidents / bookings × 1000</li>
            <li>NPS proxy: mean review rating × 2 (1–5 → ~2–10)</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
