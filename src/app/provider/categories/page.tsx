import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyToCategory } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  evaluateChecklist,
  type ChecklistItem,
} from "@/lib/compliance/matrix";
import { linksForMissingTypes } from "@/lib/compliance/official-links";
import { groupCategories } from "@/lib/categories/groups";
import type { CredentialType } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProviderCategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROVIDER") redirect("/");

  const [profile, categories] = await Promise.all([
    db.providerProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        credentials: true,
        categories: { include: { category: true } },
        passport: true,
      },
    }),
    db.category.findMany({
      orderBy: [{ groupSort: "asc" }, { sortOrder: "asc" }],
    }),
  ]);
  if (!profile) redirect("/provider");

  const groups = groupCategories(categories);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Category applications
          </h1>
          <p className="text-sm text-zinc-500">
            Apply by group. Missing documents link to official registration
            forms where available.
          </p>
        </div>
        <Link href="/provider/verify" className={buttonClass("secondary", "sm")}>
          Verify identity
        </Link>
      </div>

      {profile.passport?.status === "ACTIVE" ? (
        <Card>
          <CardBody className="text-sm text-zinc-400">
            Aegis Passport issued:{" "}
            <Link
              href={`/passport/${profile.passport.publicSlug}`}
              className="text-[#3dd6c6] hover:underline"
            >
              {profile.passport.passportNumber}
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.groupKey} className="space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-[#e87722]">
              {g.groupLabel}
            </h2>
            {g.items.map((cat) => {
              const checklist = JSON.parse(
                cat.checklistJson || "[]",
              ) as ChecklistItem[];
              const results = evaluateChecklist(checklist, profile.credentials);
              const missing = results.filter((r) => r.required && !r.satisfied);
              const official = linksForMissingTypes(
                missing.map((m) => m.type as CredentialType),
              );
              const existing = profile.categories.find(
                (c) => c.categoryId === cat.id,
              );

              return (
                <Card key={cat.id}>
                  <CardHeader
                    title={cat.name}
                    subtitle={cat.description}
                    action={
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={cat.mode === "ACTIVE" ? "success" : "warn"}>
                          {cat.mode}
                        </Badge>
                      </div>
                    }
                  />
                  <CardBody className="space-y-3">
                    <ul className="grid gap-1 text-xs sm:grid-cols-2">
                      {results.map((r) => (
                        <li
                          key={r.type + r.label}
                          className={
                            r.satisfied ? "text-[#3fb950]" : "text-[#d29922]"
                          }
                        >
                          {r.satisfied ? "✓" : "○"} {r.label}
                          {r.required ? "" : " (optional)"}
                        </li>
                      ))}
                    </ul>

                    {missing.length && official.length ? (
                      <div className="rounded-lg border border-[#e87722]/25 bg-[rgba(232,119,34,0.06)] p-3">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-[#e87722]">
                          Obtain missing evidence
                        </p>
                        <ul className="mt-2 space-y-2">
                          {official.map((link) => (
                            <li key={link.code}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#3dd6c6] hover:underline"
                              >
                                {link.title} ↗
                              </a>
                              <p className="text-xs text-zinc-500">
                                {link.description}
                              </p>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[10px] text-zinc-600">
                          Official third-party sites. Aegis does not issue
                          government licences or DBS certificates.
                        </p>
                      </div>
                    ) : null}

                    {existing ? (
                      <Badge
                        tone={
                          existing.status === "VERIFIED"
                            ? "success"
                            : existing.status === "WAITLIST"
                              ? "warn"
                              : "navy"
                        }
                      >
                        Status: {existing.status} · {existing.trustTier}
                      </Badge>
                    ) : (
                      <form action={applyToCategory}>
                        <input type="hidden" name="categoryId" value={cat.id} />
                        <button type="submit" className={buttonClass("primary", "sm")}>
                          {cat.mode === "WAITLIST"
                            ? "Join waitlist"
                            : missing.length
                              ? `Submit with ${missing.length} gap(s)`
                              : "Submit for review"}
                        </button>
                      </form>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
