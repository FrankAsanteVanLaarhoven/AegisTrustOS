import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const steps = await db.trustPlaybookStep.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          Trust &amp; Safety playbook
        </h1>
        <p className="text-sm text-zinc-500">
          Operational standards for the hybrid agency layer.
        </p>
      </div>
      {steps.map((s) => (
        <Card key={s.id}>
          <CardHeader
            title={`${s.code}: ${s.title}`}
            action={<Badge tone="navy">{s.verticalPhase}</Badge>}
          />
          <CardBody>
            <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {s.bodyMarkdown}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
