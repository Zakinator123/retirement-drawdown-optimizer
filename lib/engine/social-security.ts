/**
 * Social Security benefit adjustment factors by claiming age.
 * Assumes Full Retirement Age (FRA) of 67 (for those born 1960 or later).
 * 
 * Early claiming reductions:
 * - First 36 months early: 5/9% per month (6.67% per year)
 * - Additional months early: 5/12% per month (5% per year)
 * 
 * Delayed retirement credits: 8% per year (0.667% per month)
 * 
 * Source: SSA.gov - Benefits By Year Of Birth
 */
const SS_ADJUSTMENT_FACTORS: Record<number, number> = {
  62: 0.70,    // 60 months early = 30% reduction
  63: 0.75,    // 48 months early = 25% reduction
  64: 0.80,    // 36 months early = 20% reduction
  65: 0.8667,  // 24 months early = 13.33% reduction (5/9 * 24)
  66: 0.9333,  // 12 months early = 6.67% reduction (5/9 * 12)
  67: 1.0,     // FRA = 100%
  68: 1.08,    // 12 months delayed = 8% increase
  69: 1.16,    // 24 months delayed = 16% increase
  70: 1.24,    // 36 months delayed = 24% increase (max)
};

/**
 * Calculate Social Security benefit for a given year.
 * 
 * @param age - Current age
 * @param fraAmount - Annual benefit at Full Retirement Age (in today's dollars)
 * @param claimAge - Age at which benefits are claimed (62-70)
 * @param yearsFromStart - Number of years from simulation start (for COLA)
 * @param inflationRate - Annual inflation rate (used as COLA proxy)
 * @returns Annual SS benefit amount for the current year
 */
export function calculateSSBenefit(
  age: number,
  fraAmount: number,
  claimAge: number,
  yearsFromStart: number,
  inflationRate: number,
): number {
  if (age < claimAge) return 0;
  
  const adjustmentFactor = SS_ADJUSTMENT_FACTORS[claimAge] ?? 1.0;
  const baseAmount = fraAmount * adjustmentFactor;
  
  // Apply COLA (Cost-of-Living Adjustment) from simulation start
  // In reality, COLA is applied annually and varies; we use inflation as proxy
  return baseAmount * Math.pow(1 + inflationRate, yearsFromStart);
}

/**
 * Social Security taxability thresholds for SINGLE filers.
 * These thresholds have NOT been adjusted for inflation since 1993.
 * 
 * For Married Filing Jointly:
 * - Threshold 1: $32,000 (50% taxable above this)
 * - Threshold 2: $44,000 (85% taxable above this)
 * 
 * Source: IRS Publication 915
 */
const SS_THRESHOLD_1_SINGLE = 25000;
const SS_THRESHOLD_2_SINGLE = 34000;

/**
 * Calculate taxable portion of Social Security benefits.
 * 
 * Formula:
 * 1. Provisional Income = AGI (excluding SS) + Tax-exempt interest + 0.5 * SS benefits
 * 2. If provisional income <= $25k: 0% taxable
 * 3. If $25k < provisional income <= $34k: Up to 50% taxable
 * 4. If provisional income > $34k: Up to 85% taxable
 * 
 * @param ssGross - Total Social Security benefits received
 * @param otherTaxableIncome - AGI excluding SS (IRA distributions, cap gains, etc.)
 * @returns Object with taxable amount and provisional income
 */
export function calculateSSTaxable(
  ssGross: number,
  otherTaxableIncome: number,
): { taxable: number; provisionalIncome: number } {
  // Provisional income = other income + 50% of SS
  const provisionalIncome = otherTaxableIncome + ssGross * 0.5;

  // Below first threshold: 0% taxable
  if (provisionalIncome <= SS_THRESHOLD_1_SINGLE) {
    return { taxable: 0, provisionalIncome };
  }

  // Between thresholds: up to 50% taxable
  if (provisionalIncome <= SS_THRESHOLD_2_SINGLE) {
    // Taxable = lesser of:
    // - 50% of excess over threshold 1
    // - 50% of SS benefits
    const taxable = Math.min(
      (provisionalIncome - SS_THRESHOLD_1_SINGLE) * 0.5,
      ssGross * 0.5,
    );
    return { taxable, provisionalIncome };
  }

  // Above second threshold: up to 85% taxable
  // Taxable = lesser of:
  // - Sum of:
  //   - 50% of (threshold 2 - threshold 1) = $4,500
  //   - 85% of excess over threshold 2
  // - 85% of SS benefits
  const portion1 = Math.min(
    (SS_THRESHOLD_2_SINGLE - SS_THRESHOLD_1_SINGLE) * 0.5,
    ssGross * 0.5,
  );
  const portion2 = (provisionalIncome - SS_THRESHOLD_2_SINGLE) * 0.85;
  const taxable = Math.min(portion1 + portion2, ssGross * 0.85);
  
  return { taxable, provisionalIncome };
}
