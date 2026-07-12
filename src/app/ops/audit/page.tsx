import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const events = await db.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: true },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Audit log</h1>
      <Card>
        <CardHeader title="Recent events" subtitle="Append-only · last 100" />
        <CardBody>
          <ul className="divide-y divide-slate-100 text-sm">
            {events.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-zinc-100">{e.action}</span>
                  <span className="text-xs text-zinc-500">
                    {formatDate(e.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {e.entityType}/{e.entityId}
                  {e.actor ? ` · ${e.actor.name}` : " · system"}
                </p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
