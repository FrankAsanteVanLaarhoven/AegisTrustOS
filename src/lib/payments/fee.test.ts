import { describe, expect, it } from "vitest";

/** Mirrors adapter fee calculation */
function applicationFeePence(amountPence: number, feeBps: number) {
  return Math.round((amountPence * feeBps) / 10_000);
}

describe("marketplace platform fee", () => {
  it("computes 15% of booking amount", () => {
    expect(applicationFeePence(10_000, 1500)).toBe(1500);
  });

  it("handles small amounts", () => {
    expect(applicationFeePence(100, 1500)).toBe(15);
  });

  it("allows zero fee", () => {
    expect(applicationFeePence(5000, 0)).toBe(0);
  });
});
