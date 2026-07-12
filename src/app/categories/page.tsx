import Link from "next/link";
import { db } from "@/lib/db";
import { groupCategories } from "@/lib/categories/groups";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ groupSort: "asc" }, { sortOrder: "asc" }],
  });
  const groups = groupCategories(categories);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold text-zinc-100">Service categories</h1>
      <p className="mt-2 max-w-2xl text-zinc-400">
        Grouped premium services. Active categories support full request → match
        → contract. Security and care remain waitlist scaffolds.
      </p>

      <div className="mt-12 space-y-14">
        {groups.map((g) => (
          <section key={g.groupKey}>
            <div className="mb-4 flex items-end justify-between gap-4 border-b border-white/[0.06] pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e87722]">
                  {g.groupKey.replace(/_/g, " ")}
                </p>
                <h2 className="text-xl font-semibold text-zinc-100">{g.groupLabel}</h2>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">
                {g.items.length} roles
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((c) => (
                <Card key={c.id}>
                  <CardBody className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={c.mode === "ACTIVE" ? "success" : "warn"}>
                        {c.mode}
                      </Badge>
                      <Badge tone="muted">{c.riskLevel}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-100">{c.name}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {c.description}
                    </p>
                    {c.phase === "SECURITY" ? (
                      <Link
                        href="/verticals/security"
                        className="text-sm font-medium text-[#3dd6c6]"
                      >
                        Security vertical →
                      </Link>
                    ) : null}
                    {c.phase === "CARE" ? (
                      <Link
                        href="/verticals/care"
                        className="text-sm font-medium text-[#3dd6c6]"
                      >
                        Care vertical →
                      </Link>
                    ) : null}
                    {c.phase === "ROBOTICS" ? (
                      <Link
                        href="/verticals/robots"
                        className="text-sm font-medium text-[#3dd6c6]"
                      >
                        Robot helpers →
                      </Link>
                    ) : null}
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
