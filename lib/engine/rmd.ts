// IRS Uniform Lifetime Table (Table III) - Updated for SECURE Act 2.0 (2024+)
// Source: IRS Publication 590-B
const RMD_DIVISORS: Record<number, number> = {
  72: 27.4,
  73: 26.5,
  74: 25.5,
  75: 24.6,
  76: 23.7,
  77: 22.9,
  78: 22.0,
  79: 21.1,
  80: 20.2,
  81: 19.4,
  82: 18.5,
  83: 17.7,
  84: 16.8,
  85: 16.0,
  86: 15.2,
  87: 14.4,
  88: 13.7,
  89: 12.9,
  90: 12.2,
  91: 11.5,
  92: 10.8,
  93: 10.1,
  94: 9.5,
  95: 8.9,
  96: 8.4,
  97: 7.8,
  98: 7.3,
  99: 6.8,
  100: 6.4,
  101: 6.0,
  102: 5.6,
  103: 5.2,
  104: 4.9,
  105: 4.6,
  106: 4.3,
  107: 4.1,
  108: 3.9,
  109: 3.7,
  110: 3.5,
  111: 3.4,
  112: 3.3,
  113: 3.1,
  114: 3.0,
  115: 2.9,
  116: 2.8,
  117: 2.7,
  118: 2.5,
  119: 2.3,
  120: 2.0,
};

// SECURE Act 2.0 RMD starting ages by birth year:
// - Born 1950 or earlier: 72
// - Born 1951-1959: 73
// - Born 1960 or later: 75
// For simplicity, we default to 73 which covers most current retirees.
// The birthYear parameter can be added later for more precise modeling.
const RMD_START_AGE_DEFAULT = 73;

/**
 * Calculate Required Minimum Distribution (RMD) for a given age.
 * Uses IRS Uniform Lifetime Table (Table III).
 * 
 * @param age - Current age of the account owner
 * @param priorYearIraBalance - IRA balance as of December 31 of the prior year
 * @param birthYear - Optional birth year to determine correct RMD start age
 * @returns RMD amount for the current year
 */
export function calculateRMD(
  age: number,
  priorYearIraBalance: number,
  birthYear?: number,
): number {
  // Determine RMD start age based on birth year (SECURE Act 2.0)
  let rmdStartAge = RMD_START_AGE_DEFAULT;
  if (birthYear !== undefined) {
    if (birthYear <= 1950) {
      rmdStartAge = 72;
    } else if (birthYear <= 1959) {
      rmdStartAge = 73;
    } else {
      rmdStartAge = 75;
    }
  }

  if (age < rmdStartAge || priorYearIraBalance <= 0) return 0;
  
  // Use table value, or extrapolate for ages > 120
  const divisor = RMD_DIVISORS[age] ?? Math.max(2.0 - (age - 120) * 0.1, 1.0);
  return priorYearIraBalance / divisor;
}
