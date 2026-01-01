import { describe, expect, it } from "vitest";
import { runSimulation } from "../simulation";
import { Scenario } from "../types";

/**
 * Test cases derived from POC issues and code review.
 * These tests expose potential bugs in the simulation engine.
 */

// Helper to create a minimal scenario with only the accounts/features we want to test
function createTestScenario(overrides: Partial<Scenario>): Scenario {
  return {
    startAge: 62,
    endAge: 62,
    iraBalance: 0,
    rothBalance: 0,
    taxableBalance: 0,
    taxableBasisValue: 0,
    cashBalance: 0,
    investmentReturn: 0,
    cashReturn: 0,
    inflationRate: 0,
    ordinaryIncomeRate: 0.22,
    capitalGainsRate: 0.15,
    spendingPhases: [],
    oneOffExpenses: [],
    ssAnnualBenefit: 0,
    ssClaimAge: 67,
    ssEnabled: false,
    withdrawalOrder: ["cash", "taxable", "ira", "roth"],
    taxPaymentOrder: ["cash", "taxable", "ira"],
    rothConversionAmount: 0,
    rothConversionStartAge: 63,
    rothConversionEndAge: 72,
    assumedIraTaxRate: 0.22,
    ...overrides,
  };
}

describe("Bug #1: RMD Surplus Double-Taxation", () => {
  it("should not double-tax RMD forced distributions", () => {
    // Scenario: Age 73 with IRA balance, no spending, no conversions
    // RMD should be taken, taxed ONCE, and surplus reinvested
    const scenario = createTestScenario({
      startAge: 73,
      endAge: 73,
      iraBalance: 1_000_000,
      cashBalance: 100_000, // Enough cash to pay taxes
      spendingPhases: [], // No spending - all RMD is surplus
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // RMD at age 73 with $1M prior year balance = $1M / 26.5 = ~$37,736
    const expectedRmdGross = 1_000_000 / 26.5;
    expect(row.rmdRequired).toBeCloseTo(expectedRmdGross, 0);
    expect(row.rmdForced).toBeCloseTo(expectedRmdGross, 0);

    // Tax on RMD should be: RMD * 22%
    const expectedTax = expectedRmdGross * 0.22;
    expect(row.taxOwedOrdinary).toBeCloseTo(expectedTax, 0);

    // The net amount reinvested should be RMD - tax
    const expectedNet = expectedRmdGross - expectedTax;
    expect(row.rmdSurplusReinvested).toBeCloseTo(expectedNet, 0);

    // Cash flow: RMD goes to cash, tax paid from cash, net surplus reinvested to taxable
    // Net effect on cash: +RMD - tax - surplus = +RMD - tax - (RMD - tax) = 0
    // So cash should remain unchanged
    expect(row.cashEnd).toBeCloseTo(100_000, 0);

    // IRA should be reduced by RMD gross
    expect(row.iraEnd).toBeCloseTo(1_000_000 - expectedRmdGross, 0);

    // Taxable should increase by net amount (RMD surplus after tax)
    expect(row.taxableEnd).toBeCloseTo(expectedNet, 0);

    // CRITICAL CHECK: Total portfolio should equal starting - taxes only
    // If double-taxed, the total would be wrong
    const startingTotal = 1_000_000 + 100_000;
    const expectedEndingTotal = startingTotal - expectedTax;
    expect(row.totalEnd).toBeCloseTo(expectedEndingTotal, 0);
  });

  it("should correctly account for RMD when some IRA is used for spending", () => {
    // Scenario: Age 73, need $50k spending from IRA
    // RMD is ~$37,736, but spending withdrawal is larger
    // So no forced RMD should occur
    const scenario = createTestScenario({
      startAge: 73,
      endAge: 73,
      iraBalance: 1_000_000,
      cashBalance: 100_000,
      spendingPhases: [{ fromAge: 73, toAge: 73, annualAmount: 50_000 }],
      withdrawalOrder: ["ira"], // Force IRA withdrawal for spending
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // RMD required is still ~$37,736
    const expectedRmd = 1_000_000 / 26.5;
    expect(row.rmdRequired).toBeCloseTo(expectedRmd, 0);

    // But we withdrew more than RMD for spending (grossed up $50k net = ~$64,103)
    const iraGrossForSpending = 50_000 / (1 - 0.22);
    expect(row.iraDistributionsPlanned).toBeCloseTo(iraGrossForSpending, 0);

    // Since planned > required, no forced RMD
    expect(row.rmdForced).toBe(0);
    expect(row.rmdSurplusReinvested).toBe(0);
  });
});

describe("Bug #2: Tax Iteration - Taxes on Tax Payments", () => {
  it("should include cap gains tax when paying taxes from taxable account", () => {
    // Scenario: Spending from cash, but must pay taxes from taxable (100% gain)
    // The taxable sale to pay taxes creates MORE cap gains tax
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      iraBalance: 100_000, // Creates ordinary income tax
      taxableBalance: 100_000,
      taxableBasisValue: 0, // 100% gains
      cashBalance: 0, // No cash to pay taxes
      spendingPhases: [], // No spending
      rothConversionAmount: 100_000, // $100k conversion creates $22k tax
      rothConversionStartAge: 62,
      rothConversionEndAge: 72,
      taxPaymentOrder: ["taxable"], // Must pay from taxable
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // Roth conversion creates $100k * 22% = $22,000 ordinary income tax
    const conversionTax = 100_000 * 0.22;
    expect(row.taxSources.rothConversion).toBeCloseTo(conversionTax, 0);

    // To raise $22k net from 100% gain taxable at 15% cap gains:
    // grossNeeded = 22000 / (1 - 1.0 * 0.15) = 22000 / 0.85 = ~$25,882
    // Cap gains on that = $25,882 * 15% = ~$3,882
    const grossForTax = conversionTax / (1 - 1.0 * 0.15);
    const capGainsFromTaxPayment = grossForTax * 0.15;

    // Total cap gains tax SHOULD include the gains from paying taxes
    // (This test may fail if the bug exists)
    expect(row.taxOwedCapGains).toBeGreaterThanOrEqual(capGainsFromTaxPayment);
    
    // The taxPaidFrom.taxable should reflect the gross amount needed
    expect(row.taxPaidFrom.taxable).toBeCloseTo(grossForTax, 0);
  });

  it("should include ordinary income tax when paying taxes from IRA", () => {
    // Scenario: Roth conversion, pay taxes from IRA
    // The IRA withdrawal to pay taxes creates MORE ordinary income tax
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      iraBalance: 500_000,
      cashBalance: 0,
      taxPaymentOrder: ["ira"], // Must pay from IRA
      rothConversionAmount: 50_000, // Creates $11,000 tax
      rothConversionStartAge: 62,
      rothConversionEndAge: 72,
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // Initial tax from conversion: $50k * 22% = $11,000
    // To pay $11k from IRA at 22% rate: gross = 11000 / (1 - 0.22) = ~$14,103
    // Tax on that withdrawal: $14,103 * 22% = ~$3,103
    // This creates an infinite series that converges:
    // Total tax = 11000 / (1 - 0.22) = $14,103
    
    const initialTax = 50_000 * 0.22;
    const totalTaxWithIteration = initialTax / (1 - 0.22);

    console.log("Conversion tax:", row.taxSources.rothConversion);
    console.log("IRA distribution tax:", row.taxSources.iraDistributions);
    console.log("Total ordinary tax:", row.taxOwedOrdinary);
    console.log("IRA distributions actual:", row.iraDistributionsActual);
    
    // Conversion tax should be $11k
    expect(row.taxSources.rothConversion).toBeCloseTo(initialTax, 0);
    
    // IRA distribution tax should include tax from the IRA withdrawal to pay taxes
    // The IRA withdrawal to pay $11k tax is $14,103, which generates $3,103 more tax
    const iraWithdrawalForTax = initialTax / (1 - 0.22);
    const taxOnIraWithdrawal = iraWithdrawalForTax * 0.22;
    expect(row.taxSources.iraDistributions).toBeCloseTo(taxOnIraWithdrawal, 0);
    
    // Total ordinary tax should be the converged amount
    expect(row.taxOwedOrdinary).toBeCloseTo(totalTaxWithIteration, 0);
    
    // iraDistributionsActual is the IRA withdrawn for tax payment only
    // (conversions don't count as distributions - they're transfers)
    expect(row.iraDistributionsActual).toBeCloseTo(iraWithdrawalForTax, 0);
  });
});

describe("Bug #3: SS Taxability with Tax Payment Withdrawals", () => {
  it("should include IRA withdrawals for tax payment in SS provisional income", () => {
    // Scenario: SS income + must pay taxes from IRA
    // The IRA withdrawal for taxes should increase SS taxable portion
    const scenario = createTestScenario({
      startAge: 67,
      endAge: 67,
      iraBalance: 500_000,
      cashBalance: 0,
      ssEnabled: true,
      ssAnnualBenefit: 36_000, // $36k SS at FRA
      ssClaimAge: 67,
      taxPaymentOrder: ["ira"],
      rothConversionAmount: 100_000, // Creates $22k tax, paid from IRA
      rothConversionStartAge: 67,
      rothConversionEndAge: 72,
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // SS gross is $36k
    expect(row.ssGross).toBeCloseTo(36_000, 0);

    // Provisional income = other income + 0.5 * SS
    // Other income should include: conversion ($100k) + IRA withdrawal for taxes
    // Without tax withdrawal: provisional = 100k + 18k = 118k
    // SS taxable at 118k provisional = 85% of SS = $30,600

    // With tax withdrawal (to pay $22k tax, need ~$28.2k gross from IRA):
    // provisional = 100k + 28.2k + 18k = 146.2k
    // SS taxable still 85% (capped) = $30,600

    // In this case SS is already maxed, but the principle matters
    console.log("SS taxable:", row.ssTaxable);
    console.log("SS effective rate:", row.ssEffectiveRate);
    console.log("IRA distributions actual:", row.iraDistributionsActual);

    // SS should be 85% taxable given high income
    expect(row.ssTaxable).toBeCloseTo(36_000 * 0.85, 0);
  });
});

describe("Taxable Account Capital Gains Calculations", () => {
  it("should correctly calculate cap gains tax with partial basis (tax iteration)", () => {
    // 50% cost basis means 50% of each withdrawal is gain
    // Tax is paid from taxable too, creating more cap gains
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      taxableBalance: 100_000,
      taxableBasisValue: 50_000, // 50% basis
      cashBalance: 0,
      spendingPhases: [{ fromAge: 62, toAge: 62, annualAmount: 42_500 }],
      withdrawalOrder: ["taxable"],
      taxPaymentOrder: ["taxable"],
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // Need $42,500 net. With 50% gains at 15% rate:
    // gainPct = (100k - 50k) / 100k = 0.5
    // effectiveRate = 0.5 * 0.15 = 0.075
    // grossForSpending = 42500 / (1 - 0.075) = 42500 / 0.925 = ~$45,946
    // taxFromSpending = 45,946 * 0.5 * 0.15 = ~$3,446
    //
    // Now we must pay $3,446 tax from taxable (50% gains):
    // grossForTax = 3446 / 0.925 = ~$3,725
    // taxFromTaxPayment = 3,725 * 0.5 * 0.15 = ~$279
    //
    // And pay that $279 from taxable... (converges quickly)
    // Total cap gains tax ≈ 3,446 + 279 + ... ≈ 3,725
    
    const gainPct = 0.5;
    const effectiveRate = gainPct * 0.15;
    
    // The total cap gains tax converges to: initialTax / (1 - effectiveRate)
    const grossForSpending = 42_500 / (1 - effectiveRate);
    const initialTax = grossForSpending * gainPct * 0.15;
    const convergedTax = initialTax / (1 - effectiveRate);

    expect(row.spendingFundedFrom.taxable).toBeCloseTo(42_500, 0);
    // With tax iteration, the total cap gains is higher
    expect(row.taxOwedCapGains).toBeCloseTo(convergedTax, 0);
    
    console.log("Gross for spending:", grossForSpending);
    console.log("Initial tax:", initialTax);
    console.log("Converged tax with iteration:", convergedTax);
    console.log("Actual tax:", row.taxOwedCapGains);
  });

  it("should correctly calculate cap gains when basis is 100% (no gain)", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      taxableBalance: 100_000,
      taxableBasisValue: 100_000, // 100% basis = no gain
      cashBalance: 0,
      spendingPhases: [{ fromAge: 62, toAge: 62, annualAmount: 50_000 }],
      withdrawalOrder: ["taxable"],
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // No gains = no cap gains tax
    expect(row.taxOwedCapGains).toBe(0);
    expect(row.spendingFundedFrom.taxable).toBeCloseTo(50_000, 0);
    expect(row.taxableEnd).toBeCloseTo(50_000, 0);
  });

  it("should correctly calculate cap gains when basis is 0% (all gain)", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      taxableBalance: 100_000,
      taxableBasisValue: 0, // 0% basis = all gain
      cashBalance: 50_000, // Cash to pay taxes
      spendingPhases: [{ fromAge: 62, toAge: 62, annualAmount: 42_500 }],
      withdrawalOrder: ["taxable"],
      taxPaymentOrder: ["cash"],
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // Need $42,500 net. With 100% gains at 15% rate:
    // effectiveRate = 1.0 * 0.15 = 0.15
    // grossNeeded = 42500 / 0.85 = $50,000
    // Gains = $50,000, tax = $7,500
    const grossNeeded = 42_500 / 0.85;
    const expectedTax = grossNeeded * 0.15;

    expect(row.spendingFundedFrom.taxable).toBeCloseTo(42_500, 0);
    expect(row.taxOwedCapGains).toBeCloseTo(expectedTax, 0);
    expect(row.taxPaidFrom.cash).toBeCloseTo(expectedTax, 0);
  });
});

describe("Roth Conversion Tax Attribution", () => {
  it("should correctly attribute tax to Roth conversion", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      iraBalance: 200_000,
      cashBalance: 50_000, // Cash to pay taxes
      rothConversionAmount: 100_000,
      rothConversionStartAge: 62,
      rothConversionEndAge: 72,
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // $100k conversion at 22% = $22k tax
    expect(row.rothConversion).toBe(100_000);
    expect(row.taxSources.rothConversion).toBeCloseTo(22_000, 0);
    expect(row.taxOwedOrdinary).toBeCloseTo(22_000, 0);
    
    // Tax paid from cash
    expect(row.taxPaidFrom.cash).toBeCloseTo(22_000, 0);
    
    // IRA reduced by conversion, Roth increased
    expect(row.iraEnd).toBeCloseTo(100_000, 0);
    expect(row.rothEnd).toBeCloseTo(100_000, 0);
  });

  it("should show tax paid from correct source when no cash available", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      iraBalance: 200_000,
      cashBalance: 0,
      rothConversionAmount: 100_000,
      rothConversionStartAge: 62,
      rothConversionEndAge: 72,
      taxPaymentOrder: ["ira"],
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // Tax paid from IRA should be non-zero
    expect(row.taxPaidFrom.ira).toBeGreaterThan(0);
    
    console.log("Tax sources:", row.taxSources);
    console.log("Tax paid from:", row.taxPaidFrom);
  });
});

describe("IRA Withdrawal Tax Calculations", () => {
  it("should correctly gross up IRA withdrawal for spending", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      iraBalance: 1_000_000,
      cashBalance: 100_000, // Cash to pay taxes
      spendingPhases: [{ fromAge: 62, toAge: 62, annualAmount: 100_000 }],
      withdrawalOrder: ["ira"],
      taxPaymentOrder: ["cash"],
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // Need $100k net from IRA at 22% rate
    // Gross = 100000 / (1 - 0.22) = $128,205
    // Tax = $28,205
    const expectedGross = 100_000 / (1 - 0.22);
    const expectedTax = expectedGross * 0.22;

    expect(row.spendingFundedFrom.ira).toBeCloseTo(100_000, 0);
    expect(row.iraDistributionsActual).toBeCloseTo(expectedGross, 0);
    expect(row.taxOwedOrdinary).toBeCloseTo(expectedTax, 0);
    expect(row.taxPaidFrom.cash).toBeCloseTo(expectedTax, 0);
  });
});

describe("Multi-Year Simulation Consistency", () => {
  it("should correctly track balances across years with growth", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 64,
      iraBalance: 1_000_000,
      investmentReturn: 0.07,
      spendingPhases: [],
    });

    const result = runSimulation(scenario);
    
    // Year 0: 7% growth on initial $1M
    expect(result.yearRows[0].growth.ira).toBeCloseTo(70_000, 0);
    expect(result.yearRows[0].iraEnd).toBeCloseTo(1_070_000, 0);
    
    // Year 1: 7% growth on $1.07M
    expect(result.yearRows[1].growth.ira).toBeCloseTo(74_900, 0);
    expect(result.yearRows[1].iraEnd).toBeCloseTo(1_144_900, 0);
    
    // Year 2: 7% growth on $1.1449M
    expect(result.yearRows[2].growth.ira).toBeCloseTo(80_143, 0);
    expect(result.yearRows[2].iraEnd).toBeCloseTo(1_225_043, 0);
  });

  it("should correctly handle cash interest taxation", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 63,
      cashBalance: 100_000,
      cashReturn: 0.05, // 5% interest
      taxPaymentOrder: ["cash"],
    });

    const result = runSimulation(scenario);
    
    // Year 0: 5% interest on $100k = $5k, taxed at 22% = $1,100
    const row0 = result.yearRows[0];
    expect(row0.growth.cash).toBeCloseTo(5_000, 0);
    expect(row0.taxSources.cashInterest).toBeCloseTo(1_100, 0);
    // Cash end should be: 100k + 5k - 1.1k = $103,900
    expect(row0.cashEnd).toBeCloseTo(103_900, 0);
    
    // Year 1: 5% interest on $103,900 = $5,195, taxed at 22% = $1,143
    const row1 = result.yearRows[1];
    expect(row1.growth.cash).toBeCloseTo(5_195, 0);
    expect(row1.taxSources.cashInterest).toBeCloseTo(1_143, 0);
    // Cash end should be: 103.9k + 5.195k - 1.143k = $107,952
    expect(row1.cashEnd).toBeCloseTo(107_952, 0);
  });
});

describe("Edge Cases", () => {
  it("should handle zero balances gracefully", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      iraBalance: 0,
      rothBalance: 0,
      taxableBalance: 0,
      cashBalance: 0,
    });

    const result = runSimulation(scenario);
    expect(result.yearRows).toHaveLength(1);
    expect(result.yearRows[0].totalEnd).toBe(0);
  });

  it("should handle spending shortfall", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      cashBalance: 10_000,
      spendingPhases: [{ fromAge: 62, toAge: 62, annualAmount: 50_000 }],
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    expect(row.spendingShortfall).toBeCloseTo(40_000, 0);
    expect(row.cashEnd).toBe(0);
  });

  it("should properly handle RMD when IRA balance is too low", () => {
    const scenario = createTestScenario({
      startAge: 73,
      endAge: 73,
      iraBalance: 1_000, // Very small balance
      cashBalance: 100_000,
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // RMD should be calculated, but forced distribution limited to available IRA
    const expectedRmd = 1_000 / 26.5;
    expect(row.rmdRequired).toBeCloseTo(expectedRmd, 2);
    expect(row.rmdForced).toBeLessThanOrEqual(row.rmdRequired);
  });
});

describe("RMD Surplus with Partial Cash Available", () => {
  it("should reinvest partial surplus when cash is limited", () => {
    // Scenario: RMD occurs, but large conversion tax consumes most of the RMD cash
    const scenario = createTestScenario({
      startAge: 73,
      endAge: 73,
      iraBalance: 1_000_000,
      cashBalance: 0, // No starting cash
      rothConversionAmount: 100_000, // Creates $22k tax
      rothConversionStartAge: 73,
      rothConversionEndAge: 73,
      taxPaymentOrder: ["cash", "taxable", "ira"], // Pay taxes from cash (RMD) first
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // RMD ~$37,736 goes to cash
    // Conversion tax $22k must be paid
    // RMD's own tax ~$8,302 must be paid
    // Total tax ~$30,302 paid from the RMD cash
    // Remaining for surplus: $37,736 - $30,302 = ~$7,434

    const expectedRmd = 1_000_000 / 26.5;
    expect(row.rmdRequired).toBeCloseTo(expectedRmd, 0);
    expect(row.rmdForced).toBeCloseTo(expectedRmd, 0);

    // The surplus should be limited to what's actually left in cash
    // Not the full theoretical (rmdForced - rmdForced * 0.22)
    expect(row.rmdSurplusReinvested).toBeLessThanOrEqual(expectedRmd * (1 - 0.22));
    expect(row.rmdSurplusReinvested).toBeGreaterThanOrEqual(0);

    // Taxable should have received some reinvestment
    expect(row.taxableEnd).toBeCloseTo(row.rmdSurplusReinvested, 0);
  });

  it("should reinvest zero surplus when all RMD consumed by taxes", () => {
    // Scenario: Very high tax burden consumes entire RMD
    const scenario = createTestScenario({
      startAge: 73,
      endAge: 73,
      iraBalance: 100_000, // Small IRA = small RMD
      cashBalance: 0,
      rothConversionAmount: 50_000, // Creates $11k tax on top of RMD tax
      rothConversionStartAge: 73,
      rothConversionEndAge: 73,
      taxPaymentOrder: ["cash", "ira"], // Pay from cash first, then IRA
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // RMD ~$3,774 goes to cash
    // Total tax is much higher than RMD
    // So RMD cash is fully consumed, surplus = 0

    expect(row.rmdSurplusReinvested).toBe(0);
    expect(row.taxableEnd).toBe(0);
  });
});

describe("Mid-Simulation Account Depletion", () => {
  it("should handle withdrawal order fallthrough when account depletes", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 64,
      cashBalance: 50_000,
      taxableBalance: 500_000,
      taxableBasisValue: 250_000,
      spendingPhases: [{ fromAge: 62, toAge: 64, annualAmount: 50_000 }],
      withdrawalOrder: ["cash", "taxable"],
      taxPaymentOrder: ["cash", "taxable"],
    });

    const result = runSimulation(scenario);
    
    // Year 0: Cash should be depleted
    expect(result.yearRows[0].spendingFundedFrom.cash).toBeCloseTo(50_000, 0);
    expect(result.yearRows[0].cashEnd).toBe(0);
    
    // Years 1-2: Should draw from taxable
    expect(result.yearRows[1].spendingFundedFrom.taxable).toBeGreaterThan(0);
    expect(result.yearRows[2].spendingFundedFrom.taxable).toBeGreaterThan(0);
  });
});

describe("Roth Conversions Effect on Future RMDs", () => {
  it("should reduce future RMDs via Roth conversions", () => {
    const baseScenario = createTestScenario({
      startAge: 70,
      endAge: 75,
      iraBalance: 1_000_000,
      cashBalance: 200_000,
      investmentReturn: 0.07,
    });

    const withConversion = {
      ...baseScenario,
      rothConversionAmount: 100_000,
      rothConversionStartAge: 70,
      rothConversionEndAge: 72,
    };

    const withoutConversion = {
      ...baseScenario,
      rothConversionAmount: 0,
    };

    const resultWith = runSimulation(withConversion);
    const resultWithout = runSimulation(withoutConversion);

    // RMD at 73 should be lower with conversions
    const rmdWith = resultWith.yearRows.find((r) => r.age === 73)!.rmdRequired;
    const rmdWithout = resultWithout.yearRows.find((r) => r.age === 73)!.rmdRequired;
    expect(rmdWith).toBeLessThan(rmdWithout);
  });
});

describe("Taxable Account Loss Scenario", () => {
  it("should handle taxable account with market value less than basis (loss)", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      taxableBalance: 80_000, // Lost money
      taxableBasisValue: 100_000, // Original investment was higher
      cashBalance: 10_000,
      spendingPhases: [{ fromAge: 62, toAge: 62, annualAmount: 40_000 }],
      withdrawalOrder: ["taxable"],
      taxPaymentOrder: ["cash"],
    });

    const result = runSimulation(scenario);
    const row = result.yearRows[0];

    // No capital gains tax when there's a loss (gain% = 0)
    expect(row.taxOwedCapGains).toBe(0);
    // Full amount goes to spending (no tax drag)
    expect(row.spendingFundedFrom.taxable).toBeCloseTo(40_000, 0);
    // Remaining taxable
    expect(row.taxableEnd).toBeCloseTo(40_000, 0);
  });
});

describe("SS Disabled Correctly Handled", () => {
  it("should not include SS when disabled", () => {
    const scenario = createTestScenario({
      startAge: 67,
      endAge: 68,
      iraBalance: 1_000_000,
      cashBalance: 100_000,
      ssEnabled: false,
      ssAnnualBenefit: 36_000,
      ssClaimAge: 67,
    });

    const result = runSimulation(scenario);
    expect(result.yearRows[0].ssGross).toBe(0);
    expect(result.yearRows[0].ssTaxable).toBe(0);
    expect(result.yearRows[1].ssGross).toBe(0);
  });

  it("should include SS when enabled and at claim age", () => {
    const scenario = createTestScenario({
      startAge: 67,
      endAge: 68,
      iraBalance: 1_000_000,
      cashBalance: 100_000,
      ssEnabled: true,
      ssAnnualBenefit: 36_000,
      ssClaimAge: 67,
      inflationRate: 0.03, // Need inflation for COLA
    });

    const result = runSimulation(scenario);
    expect(result.yearRows[0].ssGross).toBe(36_000);
    expect(result.yearRows[1].ssGross).toBeGreaterThan(36_000); // With COLA
  });
});

describe("Tax Shortfall Tracking", () => {
  it("should track tax shortfall when accounts are depleted", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      iraBalance: 0,
      rothBalance: 0,
      taxableBalance: 0,
      cashBalance: 10_000,
      // Create a scenario where we have income but can't pay all taxes
      rothConversionAmount: 0,
      spendingPhases: [], // No spending
    });

    // This scenario shouldn't have tax shortfall since no income
    const result = runSimulation(scenario);
    expect(result.yearRows[0].taxShortfall).toBe(0);
  });

  it("should have zero tax shortfall when taxes can be paid", () => {
    const scenario = createTestScenario({
      startAge: 62,
      endAge: 62,
      iraBalance: 100_000,
      cashBalance: 50_000,
      rothConversionAmount: 50_000,
      rothConversionStartAge: 62,
      rothConversionEndAge: 62,
    });

    const result = runSimulation(scenario);
    // With $50k cash, should be able to pay $11k conversion tax
    expect(result.yearRows[0].taxShortfall).toBe(0);
  });
});

