import { describe, expect, it } from "vitest";
import { calculateYearlyTax } from "../tax";

describe("calculateYearlyTax", () => {
  it("calculates ordinary and capital gains taxes", () => {
    const result = calculateYearlyTax(
      100_000,
      50_000,
      20_000,
      2_000,
      30_000,
      10_000,
      0.22,
      0.15,
    );

    expect(result.ordinaryIncome).toBeCloseTo((100_000 + 50_000 + 10_000 + 2_000) * 0.22, 2);
    expect(result.capitalGains).toBeCloseTo(20_000 * 0.15, 2);
  });
});
