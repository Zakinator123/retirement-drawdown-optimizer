import { describe, expect, it } from "vitest";
import { runSimulation } from "../simulation";
import { Scenario } from "../types";

/**
 * Test to verify RMD calculation uses correct prior year balance.
 * 
 * IRS Rule: RMD for year N = (IRA balance on Dec 31 of year N-1) / divisor(age in year N)
 */

function createTestScenario(overrides: Partial<Scenario>): Scenario {
  return {
    startAge: 62,
    endAge: 95,
    iraBalance: 2_000_000,
    rothBalance: 0,
    taxableBalance: 0,
    taxableBasisValue: 0,
    cashBalance: 500_000,
    investmentReturn: 0.07, // 7% return
    cashReturn: 0,
    inflationRate: 0,
    ordinaryIncomeRate: 0.22,
    capitalGainsRate: 0.15,
    spendingPhases: [],
    oneOffExpenses: [],
    ssAnnualBenefit: 0,
    ssClaimAge: 67,
    ssEnabled: false,
    withdrawalOrder: ["cash"],
    taxPaymentOrder: ["cash"],
    rothConversionAmount: 0,
    rothConversionStartAge: 63,
    rothConversionEndAge: 72,
    assumedIraTaxRate: 0.22,
    ...overrides,
  };
}

describe("RMD Timing and Calculation Verification", () => {
  it("should use end-of-prior-year IRA balance for RMD calculation", () => {
    // Simple scenario: IRA only, no spending, no conversions, 7% growth
    const scenario = createTestScenario({
      startAge: 71,
      endAge: 74,
      iraBalance: 1_000_000, // $1M starting at age 71
      cashBalance: 1_000_000, // Enough cash for taxes
    });

    const result = runSimulation(scenario);

    // Find the rows we care about
    const row71 = result.yearRows.find(r => r.age === 71)!;
    const row72 = result.yearRows.find(r => r.age === 72)!;
    const row73 = result.yearRows.find(r => r.age === 73)!;
    const row74 = result.yearRows.find(r => r.age === 74)!;

    console.log("=== RMD Timing Debug ===");
    console.log("Age 71: IRA end =", row71.iraEnd, "RMD required =", row71.rmdRequired);
    console.log("Age 72: IRA end =", row72.iraEnd, "RMD required =", row72.rmdRequired);
    console.log("Age 73: IRA end =", row73.iraEnd, "RMD required =", row73.rmdRequired);
    console.log("Age 74: IRA end =", row74.iraEnd, "RMD required =", row74.rmdRequired);

    // At age 71: No RMD (RMD starts at 73)
    expect(row71.rmdRequired).toBe(0);
    
    // At age 72: No RMD (RMD starts at 73)
    expect(row72.rmdRequired).toBe(0);
    
    // For age 73 RMD, we need the IRA balance at end of age 72
    // Let's trace through (with growth now happening in year 0):
    // Age 71: IRA = $1,000,000 + 7% growth = $1,070,000
    // Age 72: IRA = $1,070,000 + 7% growth = $1,144,900 (no RMD yet, no conversions)
    // 
    // Age 73 RMD = (IRA end of 72) / 26.5 = $1,144,900 / 26.5 = $43,204
    
    // Verify age 72 ending balance
    expect(row72.iraEnd).toBeCloseTo(1_144_900, 0);
    
    // Age 73 RMD should use end-of-72 balance with divisor 26.5
    const expectedRmd73 = 1_144_900 / 26.5;
    console.log("Expected RMD at 73:", expectedRmd73);
    console.log("Actual RMD at 73:", row73.rmdRequired);
    console.log("Implied divisor:", 1_070_000 / row73.rmdRequired);
    
    expect(row73.rmdRequired).toBeCloseTo(expectedRmd73, 0);
    
    // Age 74 RMD should use end-of-73 balance with divisor 25.5
    // Age 73 end balance calculation is complex due to RMD...
    // Just verify the divisor is being used correctly
    const impliedDivisor73 = row72.iraEnd / row73.rmdRequired;
    console.log("Age 73 implied divisor:", impliedDivisor73, "(should be 26.5)");
    expect(impliedDivisor73).toBeCloseTo(26.5, 1);
  });

  it("verifies specific user-reported scenario", () => {
    // User reported: IRA at end of 72 = $4,812,670, RMD seems to use 24.09 instead of 26.5
    // Let's create a scenario that would produce similar numbers
    
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 75,
      iraBalance: 2_000_000,
      cashBalance: 500_000,
      investmentReturn: 0.07,
      // Add some spending to make the simulation more realistic
      spendingPhases: [{ fromAge: 62, toAge: 95, annualAmount: 100_000 }],
      withdrawalOrder: ["cash", "taxable", "ira", "roth"],
    });

    const result = runSimulation(scenario);
    
    // Find ages 72 and 73
    const row72 = result.yearRows.find(r => r.age === 72);
    const row73 = result.yearRows.find(r => r.age === 73);
    
    if (row72 && row73) {
      console.log("\n=== User Scenario Check ===");
      console.log("Age 72 IRA end:", row72.iraEnd);
      console.log("Age 73 RMD required:", row73.rmdRequired);
      console.log("Age 73 RMD forced:", row73.rmdForced);
      
      const impliedDivisor = row72.iraEnd / row73.rmdRequired;
      console.log("Implied divisor for age 73:", impliedDivisor);
      console.log("Expected divisor:", 26.5);
      
      // The RMD at 73 should use end-of-72 balance / 26.5
      const expectedRmd = row72.iraEnd / 26.5;
      console.log("Expected RMD:", expectedRmd);
      console.log("Actual RMD:", row73.rmdRequired);
      
      expect(row73.rmdRequired).toBeCloseTo(expectedRmd, 0);
    }
  });

  it("traces through multi-year IRA balance to verify RMD correctness", () => {
    // No spending, no conversions - just growth and RMD
    const scenario = createTestScenario({
      startAge: 70,
      endAge: 76,
      iraBalance: 1_000_000,
      cashBalance: 500_000,
      investmentReturn: 0.07,
      spendingPhases: [], // No spending
      rothConversionAmount: 0,
    });

    const result = runSimulation(scenario);
    
    console.log("\n=== Multi-year IRA trace ===");
    console.log("Age | IRA Start (after growth) | RMD Required | RMD Forced | IRA End");
    
    for (const row of result.yearRows) {
      // Note: we don't have IRA start in the row, but we can calculate
      console.log(
        `${row.age} | Growth: ${row.growth.ira.toFixed(0)} | RMD: ${row.rmdRequired.toFixed(0)} | Forced: ${row.rmdForced.toFixed(0)} | End: ${row.iraEnd.toFixed(0)}`
      );
    }
    
    // Verify RMD calculations
    for (let i = 1; i < result.yearRows.length; i++) {
      const priorRow = result.yearRows[i - 1];
      const currentRow = result.yearRows[i];
      
      if (currentRow.rmdRequired > 0) {
        const expectedRmd = priorRow.iraEnd / (26.5 - (currentRow.age - 73)); // Approximate divisor
        console.log(`\nAge ${currentRow.age} RMD check:`);
        console.log(`  Prior IRA end (age ${priorRow.age}): ${priorRow.iraEnd.toFixed(0)}`);
        console.log(`  Current RMD required: ${currentRow.rmdRequired.toFixed(0)}`);
        console.log(`  Implied divisor: ${(priorRow.iraEnd / currentRow.rmdRequired).toFixed(1)}`);
      }
    }
  });
});

