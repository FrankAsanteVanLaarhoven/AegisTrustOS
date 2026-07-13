import Link from "next/link";
import { db } from "@/lib/db";
import { groupCategories, type GroupableCategory } from "@/lib/categories/groups";
import { CATEGORY_SEEDS } from "@/lib/compliance/matrix";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function seedsAsCategories(): GroupableCategory[] {
  return CATEGORY_SEEDS.map((c, i) => ({
    id: `seed-${c.slug}`,
    slug: c.slug,
    name: c.name,
    description: c.description,
    mode: c.mode,
    phase: c.phase,
    riskLevel: c.riskLevel,
    sortOrder: c.sortOrder,
    groupKey: c.groupKey,
    groupLabel: c.groupLabel,
    groupSort: c.groupSort,
  }));
}

export default async function CategoriesPage() {
  let categories: GroupableCategory[] = [];
  let source: "database" | "seed_fallback" = "database";
  let dbError: string | null = null;

  try {
    categories = await db.category.findMany({
      orderBy: [{ groupSort: "asc" }, { sortOrder: "asc" }],
    });
    if (!categories.length) {
      categories = seedsAsCategories();
      source = "seed_fallback";
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message : "database unavailable";
    categories = seedsAsCategories();
    source = "seed_fallback";
  }

  const groups = groupCategories(categories);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold text-zinc-100">Service categories</h1>
      <p className="mt-2 max-w-2xl text-zinc-400">
        Grouped premium services. Active categories support full request → match
        → contract. Security and care remain waitlist scaffolds.
      </p>

      {source === "seed_fallback" ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium">Showing built-in catalogue (database offline)</p>
          <p className="mt-1 text-xs text-amber-100/70">
            Set <code className="text-amber-50">DATABASE_URL</code> to a Postgres
            connection (e.g. Neon) in Vercel Production env, redeploy, then seed.
            {dbError ? (
              <span className="mt-1 block font-mono text-[10px] opacity-80">
                {dbError.slice(0, 160)}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

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
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-zinc-100">{c.name}</h3>
                      <Badge
                        tone={
                          c.mode === "ACTIVE"
                            ? "success"
                            : c.mode === "WAITLIST"
                              ? "warn"
                              : "muted"
                        }
                      >
                        {c.mode}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-500 line-clamp-3">
                      {c.description}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-600">
                      {c.phase} · {c.riskLevel}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-zinc-500">
        Ready to request?{" "}
        <Link href="/register" className="text-[#e87722] hover:underline">
          Enrol as a client
        </Link>{" "}
        or{" "}
        <Link href="/login" className="text-[#e87722] hover:underline">
          Access
        </Link>
        .
      </p>
    </div>
  );
}
