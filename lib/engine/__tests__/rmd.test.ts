import { describe, expect, it } from "vitest";
import { calculateRMD } from "../rmd";

describe("calculateRMD", () => {
  describe("RMD start age (default behavior)", () => {
    it("returns zero before age 73 (default RMD start age)", () => {
      expect(calculateRMD(70, 1_000_000)).toBe(0);
      expect(calculateRMD(71, 1_000_000)).toBe(0);
      expect(calculateRMD(72, 1_000_000)).toBe(0);
    });

    it("returns RMD starting at age 73", () => {
      expect(calculateRMD(73, 1_000_000)).toBeGreaterThan(0);
    });
  });

  describe("RMD start age with birth year (SECURE Act 2.0)", () => {
    it("starts RMD at 72 for those born 1950 or earlier", () => {
      // Born 1950: RMD starts at 72
      expect(calculateRMD(72, 1_000_000, 1950)).toBeGreaterThan(0);
      expect(calculateRMD(71, 1_000_000, 1950)).toBe(0);
    });

    it("starts RMD at 73 for those born 1951-1959", () => {
      // Born 1955: RMD starts at 73
      expect(calculateRMD(73, 1_000_000, 1955)).toBeGreaterThan(0);
      expect(calculateRMD(72, 1_000_000, 1955)).toBe(0);
    });

    it("starts RMD at 75 for those born 1960 or later", () => {
      // Born 1960+: RMD starts at 75
      expect(calculateRMD(75, 1_000_000, 1960)).toBeGreaterThan(0);
      expect(calculateRMD(74, 1_000_000, 1960)).toBe(0);
      expect(calculateRMD(73, 1_000_000, 1965)).toBe(0);
    });
  });

  describe("RMD calculation accuracy (IRS Uniform Lifetime Table)", () => {
    // Test cases based on IRS Publication 590-B Uniform Lifetime Table III
    it("calculates RMD at age 73 correctly", () => {
      // Age 73 divisor = 26.5
      const rmd = calculateRMD(73, 1_000_000);
      expect(rmd).toBeCloseTo(1_000_000 / 26.5, 2);
      expect(rmd).toBeCloseTo(37_735.85, 0);
    });

    it("calculates RMD at age 75 correctly", () => {
      // Age 75 divisor = 24.6
      const rmd = calculateRMD(75, 1_000_000);
      expect(rmd).toBeCloseTo(1_000_000 / 24.6, 2);
      expect(rmd).toBeCloseTo(40_650.41, 0);
    });

    it("calculates RMD at age 80 correctly", () => {
      // Age 80 divisor = 20.2
      const rmd = calculateRMD(80, 1_000_000);
      expect(rmd).toBeCloseTo(1_000_000 / 20.2, 2);
      expect(rmd).toBeCloseTo(49_504.95, 0);
    });

    it("calculates RMD at age 90 correctly", () => {
      // Age 90 divisor = 12.2
      const rmd = calculateRMD(90, 1_000_000);
      expect(rmd).toBeCloseTo(1_000_000 / 12.2, 2);
      expect(rmd).toBeCloseTo(81_967.21, 0);
    });

    it("calculates RMD at age 100 correctly", () => {
      // Age 100 divisor = 6.4
      const rmd = calculateRMD(100, 1_000_000);
      expect(rmd).toBeCloseTo(1_000_000 / 6.4, 2);
      expect(rmd).toBeCloseTo(156_250, 0);
    });
  });

  describe("edge cases", () => {
    it("returns zero when prior year balance is zero", () => {
      expect(calculateRMD(75, 0)).toBe(0);
    });

    it("returns zero when prior year balance is negative", () => {
      expect(calculateRMD(75, -1000)).toBe(0);
    });

    it("handles ages beyond the table (extrapolation)", () => {
      // Age 120 divisor = 2.0, extrapolate beyond
      const rmd120 = calculateRMD(120, 1_000_000);
      expect(rmd120).toBeCloseTo(1_000_000 / 2.0, 0);
      
      // Age 121+ uses extrapolation formula
      const rmd125 = calculateRMD(125, 1_000_000);
      expect(rmd125).toBeGreaterThan(0);
    });
  });
});
