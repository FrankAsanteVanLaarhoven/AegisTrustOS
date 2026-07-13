import { describe, expect, it } from "vitest";
import { computePilotKpis } from "@/lib/services/pilot-service";

describe("pilot demand KPIs", () => {
  it("computes go signal when interviews ≥10 and strong interest ≥70%", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      kind: "INTERVIEW" as const,
      status: "INTERVIEWED" as const,
      interestScore: i < 8 ? 8 : 5, // 80% strong
      nextUseCase: i < 6 ? "Need PA next month" : null,
      pilotWilling: i < 5,
      warmIntros: 1,
    }));
    const k = computePilotKpis(rows);
    expect(k.interviewsCompleted).toBe(10);
    expect(k.strongInterestRate).toBe(0.8);
    expect(k.goSignal).toBe(true);
    expect(k.namedUseCaseRate).toBe(0.6);
    expect(k.warmIntrosTotal).toBe(10);
  });

  it("does not go without enough interviews", () => {
    const rows = Array.from({ length: 5 }, () => ({
      kind: "INTERVIEW" as const,
      status: "INTERVIEWED" as const,
      interestScore: 9,
      nextUseCase: "Yes",
      pilotWilling: true,
      warmIntros: 0,
    }));
    const k = computePilotKpis(rows);
    expect(k.goSignal).toBe(false);
  });

  it("counts public interest separately", () => {
    const k = computePilotKpis([
      {
        kind: "PUBLIC_INTEREST",
        status: "NEW",
        interestScore: null,
        nextUseCase: null,
        pilotWilling: null,
        warmIntros: 0,
      },
      {
        kind: "SUPPLY",
        status: "NEW",
        interestScore: null,
        nextUseCase: null,
        pilotWilling: null,
        warmIntros: 0,
      },
    ]);
    expect(k.publicInterest).toBe(1);
    expect(k.supplyLeads).toBe(1);
    expect(k.interviewsCompleted).toBe(0);
  });
});
