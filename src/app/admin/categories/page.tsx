import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Categories</h1>
      {categories.map((c) => (
        <Card key={c.id}>
          <CardHeader
            title={c.name}
            subtitle={c.slug}
            action={
              <div className="flex gap-1">
                <Badge tone={c.mode === "ACTIVE" ? "success" : "warn"}>{c.mode}</Badge>
                <Badge tone="muted">{c.phase}</Badge>
              </div>
            }
          />
          <CardBody>
            <p className="text-sm text-zinc-400">{c.description}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Risk {c.riskLevel} · checklist length{" "}
              {JSON.parse(c.checklistJson || "[]").length}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
