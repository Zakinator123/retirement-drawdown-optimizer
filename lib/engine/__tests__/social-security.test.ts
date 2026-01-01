import { describe, expect, it } from "vitest";
import { calculateSSBenefit, calculateSSTaxable } from "../social-security";

describe("Social Security Benefits", () => {
  describe("claiming age adjustments (FRA 67)", () => {
    const fraAmount = 30_000; // $30k at FRA (age 67)

    it("reduces benefit by 30% when claiming at age 62", () => {
      const benefit = calculateSSBenefit(62, fraAmount, 62, 0, 0);
      expect(benefit).toBeCloseTo(fraAmount * 0.70, 0);
      expect(benefit).toBeCloseTo(21_000, 0);
    });

    it("reduces benefit by 25% when claiming at age 63", () => {
      const benefit = calculateSSBenefit(63, fraAmount, 63, 0, 0);
      expect(benefit).toBeCloseTo(fraAmount * 0.75, 0);
      expect(benefit).toBeCloseTo(22_500, 0);
    });

    it("reduces benefit by 20% when claiming at age 64", () => {
      const benefit = calculateSSBenefit(64, fraAmount, 64, 0, 0);
      expect(benefit).toBeCloseTo(fraAmount * 0.80, 0);
      expect(benefit).toBeCloseTo(24_000, 0);
    });

    it("reduces benefit by ~13.3% when claiming at age 65", () => {
      const benefit = calculateSSBenefit(65, fraAmount, 65, 0, 0);
      expect(benefit).toBeCloseTo(fraAmount * 0.8667, 0);
      // $30k * 0.8667 = $26,001
      expect(benefit).toBeCloseTo(26_001, 0);
    });

    it("reduces benefit by ~6.7% when claiming at age 66", () => {
      const benefit = calculateSSBenefit(66, fraAmount, 66, 0, 0);
      expect(benefit).toBeCloseTo(fraAmount * 0.9333, 0);
      // $30k * 0.9333 = $27,999
      expect(benefit).toBeCloseTo(27_999, 0);
    });

    it("provides 100% benefit when claiming at FRA (67)", () => {
      const benefit = calculateSSBenefit(67, fraAmount, 67, 0, 0);
      expect(benefit).toBe(fraAmount);
      expect(benefit).toBe(30_000);
    });

    it("increases benefit by 8% when delaying to age 68", () => {
      const benefit = calculateSSBenefit(68, fraAmount, 68, 0, 0);
      expect(benefit).toBeCloseTo(fraAmount * 1.08, 0);
      expect(benefit).toBeCloseTo(32_400, 0);
    });

    it("increases benefit by 16% when delaying to age 69", () => {
      const benefit = calculateSSBenefit(69, fraAmount, 69, 0, 0);
      expect(benefit).toBeCloseTo(fraAmount * 1.16, 0);
      expect(benefit).toBeCloseTo(34_800, 0);
    });

    it("increases benefit by 24% when delaying to age 70 (max)", () => {
      const benefit = calculateSSBenefit(70, fraAmount, 70, 0, 0);
      expect(benefit).toBeCloseTo(fraAmount * 1.24, 0);
      expect(benefit).toBeCloseTo(37_200, 0);
    });
  });

  describe("COLA adjustments", () => {
    it("applies COLA over multiple years", () => {
      const fraAmount = 30_000;
      const inflationRate = 0.03; // 3% COLA

      // Year 0: No COLA
      expect(calculateSSBenefit(67, fraAmount, 67, 0, inflationRate)).toBe(30_000);

      // Year 1: 3% increase
      expect(calculateSSBenefit(68, fraAmount, 67, 1, inflationRate)).toBeCloseTo(30_900, 0);

      // Year 5: Compounded ~15.9% increase
      expect(calculateSSBenefit(72, fraAmount, 67, 5, inflationRate))
        .toBeCloseTo(30_000 * Math.pow(1.03, 5), 0);
    });
  });

  describe("benefit timing", () => {
    it("returns zero before claim age", () => {
      expect(calculateSSBenefit(62, 30_000, 67, 0, 0)).toBe(0);
      expect(calculateSSBenefit(66, 30_000, 67, 0, 0)).toBe(0);
    });

    it("returns benefit starting at claim age", () => {
      expect(calculateSSBenefit(67, 30_000, 67, 0, 0)).toBe(30_000);
      expect(calculateSSBenefit(68, 30_000, 67, 1, 0)).toBe(30_000);
    });
  });
});

describe("Social Security Taxability (Single Filer)", () => {
  describe("below first threshold ($25k provisional income)", () => {
    it("returns 0% taxable when provisional income is below $25k", () => {
      // $20k other income + $6k SS → provisional = $20k + $3k = $23k < $25k
      const result = calculateSSTaxable(6_000, 20_000);
      expect(result.taxable).toBe(0);
      expect(result.provisionalIncome).toBe(23_000);
    });

    it("returns 0% taxable at exactly $25k provisional income", () => {
      // $22k other income + $6k SS → provisional = $22k + $3k = $25k
      const result = calculateSSTaxable(6_000, 22_000);
      expect(result.taxable).toBe(0);
      expect(result.provisionalIncome).toBe(25_000);
    });
  });

  describe("between thresholds ($25k-$34k provisional income)", () => {
    it("taxes 50% of excess over first threshold", () => {
      // $27k other income + $6k SS → provisional = $27k + $3k = $30k
      // Taxable = ($30k - $25k) * 0.5 = $2,500
      const result = calculateSSTaxable(6_000, 27_000);
      expect(result.taxable).toBeCloseTo(2_500, 0);
      expect(result.provisionalIncome).toBe(30_000);
    });

    it("caps taxable at 50% of SS benefits", () => {
      // $32k other income + $6k SS → provisional = $32k + $3k = $35k
      // But we're testing the cap within the middle bracket
      // At $34k provisional: excess = $9k, 50% = $4,500
      // But max 50% of $6k SS = $3k, so capped at $3k
      const result = calculateSSTaxable(6_000, 31_000);
      expect(result.taxable).toBeLessThanOrEqual(3_000); // 50% of SS
    });
  });

  describe("above second threshold ($34k+ provisional income)", () => {
    it("taxes up to 85% with high income", () => {
      // $50k other income + $30k SS → provisional = $50k + $15k = $65k
      // Well above $34k threshold
      const result = calculateSSTaxable(30_000, 50_000);
      // Should be 85% of SS = $25,500
      expect(result.taxable).toBeCloseTo(25_500, 0);
      expect(result.provisionalIncome).toBe(65_000);
    });

    it("caps taxable at 85% of SS benefits", () => {
      // Very high income should still cap at 85%
      const result = calculateSSTaxable(30_000, 200_000);
      expect(result.taxable).toBeCloseTo(30_000 * 0.85, 0);
      expect(result.taxable).toBeCloseTo(25_500, 0);
    });

    it("correctly calculates partial 85% taxation", () => {
      // $32k other income + $30k SS → provisional = $32k + $15k = $47k
      // Portion 1: ($34k - $25k) * 0.5 = $4,500
      // Portion 2: ($47k - $34k) * 0.85 = $11,050
      // Total: $15,550 (less than 85% of $30k = $25,500, so no cap)
      const result = calculateSSTaxable(30_000, 32_000);
      expect(result.taxable).toBeCloseTo(4_500 + 11_050, 0);
      expect(result.provisionalIncome).toBe(47_000);
    });
  });

  describe("edge cases", () => {
    it("handles zero SS benefits", () => {
      const result = calculateSSTaxable(0, 50_000);
      expect(result.taxable).toBe(0);
      expect(result.provisionalIncome).toBe(50_000);
    });

    it("handles zero other income", () => {
      // $0 other income + $30k SS → provisional = $0 + $15k = $15k < $25k
      const result = calculateSSTaxable(30_000, 0);
      expect(result.taxable).toBe(0);
      expect(result.provisionalIncome).toBe(15_000);
    });
  });
});
