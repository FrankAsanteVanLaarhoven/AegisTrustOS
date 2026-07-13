import { db } from "@/lib/db";
import type { PilotLeadKind, PilotLeadStatus } from "@prisma/client";

export type PilotKpis = {
  totalLeads: number;
  interviewsCompleted: number;
  strongInterestCount: number;
  strongInterestRate: number | null;
  namedUseCaseCount: number;
  namedUseCaseRate: number | null;
  pilotYesCount: number;
  warmIntrosTotal: number;
  publicInterest: number;
  supplyLeads: number;
  agencyLeads: number;
  /** Go signal: interviews ≥10 and strong interest ≥70% */
  goSignal: boolean;
  targets: {
    interviews: number;
    strongInterestRate: number;
    namedUseCaseRate: number;
  };
};

const TARGETS = {
  interviews: 10,
  strongInterestRate: 0.7,
  namedUseCaseRate: 0.5,
} as const;

export function computePilotKpis(
  rows: {
    kind: PilotLeadKind;
    status: PilotLeadStatus;
    interestScore: number | null;
    nextUseCase: string | null;
    pilotWilling: boolean | null;
    warmIntros: number;
  }[],
): PilotKpis {
  const interviews = rows.filter(
    (r) =>
      r.kind === "INTERVIEW" ||
      r.status === "INTERVIEWED" ||
      r.status === "PILOT_YES" ||
      r.status === "PILOT_NO",
  );
  // Prefer explicit INTERVIEW kind for completed interview metrics
  const interviewPool = rows.filter((r) => r.kind === "INTERVIEW");
  const pool = interviewPool.length ? interviewPool : interviews;

  const scored = pool.filter((r) => r.interestScore != null);
  const strong = scored.filter((r) => (r.interestScore ?? 0) >= 7);
  const named = pool.filter((r) => (r.nextUseCase ?? "").trim().length > 0);
  const pilotYes = rows.filter(
    (r) => r.pilotWilling === true || r.status === "PILOT_YES",
  );
  const warm = rows.reduce((s, r) => s + (r.warmIntros ?? 0), 0);

  const strongRate =
    scored.length > 0 ? strong.length / scored.length : null;
  const namedRate = pool.length > 0 ? named.length / pool.length : null;

  const goSignal =
    pool.length >= TARGETS.interviews &&
    strongRate != null &&
    strongRate >= TARGETS.strongInterestRate;

  return {
    totalLeads: rows.length,
    interviewsCompleted: pool.length,
    strongInterestCount: strong.length,
    strongInterestRate: strongRate,
    namedUseCaseCount: named.length,
    namedUseCaseRate: namedRate,
    pilotYesCount: pilotYes.length,
    warmIntrosTotal: warm,
    publicInterest: rows.filter((r) => r.kind === "PUBLIC_INTEREST").length,
    supplyLeads: rows.filter((r) => r.kind === "SUPPLY").length,
    agencyLeads: rows.filter((r) => r.kind === "AGENCY").length,
    goSignal,
    targets: {
      interviews: TARGETS.interviews,
      strongInterestRate: TARGETS.strongInterestRate,
      namedUseCaseRate: TARGETS.namedUseCaseRate,
    },
  };
}

export async function getPilotKpisFromDb(): Promise<PilotKpis> {
  const rows = await db.pilotLead.findMany({
    select: {
      kind: true,
      status: true,
      interestScore: true,
      nextUseCase: true,
      pilotWilling: true,
      warmIntros: true,
    },
  });
  return computePilotKpis(rows);
}

export async function createPublicInterest(input: {
  name: string;
  email: string;
  organisation?: string;
  persona?: string;
  city?: string;
  categories?: string[];
  nextUseCase?: string;
  notes?: string;
  source?: string;
}) {
  return db.pilotLead.create({
    data: {
      kind: "PUBLIC_INTEREST",
      status: "NEW",
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      organisation: input.organisation?.trim() || null,
      persona: input.persona?.trim() || null,
      city: input.city?.trim() || "London",
      categoriesJson: JSON.stringify(input.categories ?? []),
      nextUseCase: input.nextUseCase?.trim() || null,
      notes: input.notes?.trim() || null,
      source: input.source ?? "landing",
    },
  });
}

export async function createInterviewLead(input: {
  name: string;
  email: string;
  organisation?: string;
  persona?: string;
  city?: string;
  categories?: string[];
  interestScore?: number | null;
  nextUseCase?: string;
  wtpNotes?: string;
  pains?: string[];
  trustIncident?: boolean | null;
  pilotWilling?: boolean | null;
  warmIntros?: number;
  objections?: string;
  notes?: string;
  source?: string;
  createdById?: string;
}) {
  const score =
    input.interestScore != null
      ? Math.min(10, Math.max(1, Math.round(input.interestScore)))
      : null;

  return db.pilotLead.create({
    data: {
      kind: "INTERVIEW",
      status:
        input.pilotWilling === true
          ? "PILOT_YES"
          : input.pilotWilling === false
            ? "PILOT_NO"
            : "INTERVIEWED",
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      organisation: input.organisation?.trim() || null,
      persona: input.persona?.trim() || null,
      city: input.city?.trim() || "London",
      categoriesJson: JSON.stringify(input.categories ?? []),
      interestScore: score,
      nextUseCase: input.nextUseCase?.trim() || null,
      wtpNotes: input.wtpNotes?.trim() || null,
      painsJson: JSON.stringify(input.pains ?? []),
      trustIncident: input.trustIncident ?? null,
      pilotWilling: input.pilotWilling ?? null,
      warmIntros: input.warmIntros ?? 0,
      objections: input.objections?.trim() || null,
      notes: input.notes?.trim() || null,
      source: input.source ?? "ops",
      interviewedAt: new Date(),
      createdById: input.createdById,
    },
  });
}

export async function updateLeadStatus(
  id: string,
  status: PilotLeadStatus,
) {
  return db.pilotLead.update({
    where: { id },
    data: { status },
  });
}
