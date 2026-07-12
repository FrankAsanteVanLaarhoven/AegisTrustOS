import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CATEGORY_SEEDS } from "@/lib/compliance/matrix";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default async function AdminCompliancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "OPS") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          UK compliance matrix
        </h1>
        <p className="text-sm text-zinc-500">
          Config-driven checklists. Platform facilitates evidence + human review —
          not a substitute for regulated registrations.
        </p>
      </div>
      {CATEGORY_SEEDS.map((c) => (
        <Card key={c.slug}>
          <CardHeader
            title={c.name}
            action={
              <div className="flex gap-1">
                <Badge tone={c.mode === "ACTIVE" ? "success" : "warn"}>{c.mode}</Badge>
                <Badge tone="muted">{c.phase}</Badge>
              </div>
            }
          />
          <CardBody>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-zinc-500">
                  <th className="py-1">Check</th>
                  <th>Type</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                {c.checklist.map((item) => (
                  <tr key={item.type + item.label} className="border-t border-white/[0.06]">
                    <td className="py-2">{item.label}</td>
                    <td className="text-zinc-500">{item.type}</td>
                    <td>{item.required ? "Yes" : "Optional"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
