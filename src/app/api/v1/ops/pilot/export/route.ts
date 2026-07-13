import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiErr } from "@/lib/api/envelope";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * CSV export of pilot leads for demand-validation ops.
 * OPS/ADMIN only.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return apiErr("UNAUTHORIZED");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    return apiErr("FORBIDDEN");
  }

  const leads = await db.pilotLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "id",
    "kind",
    "status",
    "persona",
    "name",
    "email",
    "organisation",
    "city",
    "categories",
    "interestScore",
    "nextUseCase",
    "wtpNotes",
    "pains",
    "trustIncident",
    "pilotWilling",
    "warmIntros",
    "objections",
    "notes",
    "source",
    "interviewedAt",
    "createdAt",
  ];

  const rows = leads.map((l) =>
    [
      l.id,
      l.kind,
      l.status,
      l.persona,
      l.name,
      l.email,
      l.organisation,
      l.city,
      l.categoriesJson,
      l.interestScore,
      l.nextUseCase,
      l.wtpNotes,
      l.painsJson,
      l.trustIncident,
      l.pilotWilling,
      l.warmIntros,
      l.objections,
      l.notes,
      l.source,
      l.interviewedAt?.toISOString() ?? "",
      l.createdAt.toISOString(),
    ]
      .map(csvEscape)
      .join(","),
  );

  const body = [header.join(","), ...rows].join("\n") + "\n";
  const filename = `aegis-pilot-leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
