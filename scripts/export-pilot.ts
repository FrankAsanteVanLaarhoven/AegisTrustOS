/**
 * CLI: export pilot leads as CSV to stdout or --out path
 * Usage: npm run export:pilot
 *        npm run export:pilot -- --out ./pilot-leads.csv
 */
import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const outIdx = process.argv.indexOf("--out");
  const outPath = outIdx >= 0 ? process.argv[outIdx + 1] : null;

  const leads = await db.pilotLead.findMany({ orderBy: { createdAt: "desc" } });
  const header = [
    "id",
    "kind",
    "status",
    "persona",
    "name",
    "email",
    "organisation",
    "interestScore",
    "nextUseCase",
    "pilotWilling",
    "warmIntros",
    "source",
    "createdAt",
  ];
  const lines = [
    header.join(","),
    ...leads.map((l) =>
      [
        l.id,
        l.kind,
        l.status,
        l.persona,
        l.name,
        l.email,
        l.organisation,
        l.interestScore,
        l.nextUseCase,
        l.pilotWilling,
        l.warmIntros,
        l.source,
        l.createdAt.toISOString(),
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];
  const csv = lines.join("\n") + "\n";
  if (outPath) {
    writeFileSync(outPath, csv, "utf8");
    console.error(`Wrote ${leads.length} leads → ${outPath}`);
  } else {
    process.stdout.write(csv);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
