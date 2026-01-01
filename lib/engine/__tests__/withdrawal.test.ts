import { describe, expect, it } from "vitest";
import { runSimulation } from "../simulation";
import { Scenario } from "../types";

describe("withdrawal gross-up", () => {
  it("grosses up IRA withdrawals to meet net spending", () => {
    const scenario: Scenario = {
      startAge: 62,
      endAge: 62,
      iraBalance: 1_000_000,
      rothBalance: 0,
      taxableBalance: 0,
      taxableBasisValue: 0,
      cashBalance: 200_000,
      investmentReturn: 0,
      cashReturn: 0,
      inflationRate: 0,
      ordinaryIncomeRate: 0.22,
      capitalGainsRate: 0.15,
      spendingPhases: [{ fromAge: 62, toAge: 62, annualAmount: 100_000 }],
      oneOffExpenses: [],
      ssAnnualBenefit: 0,
      ssClaimAge: 67,
      ssEnabled: false,
      withdrawalOrder: ["ira"],
      taxPaymentOrder: ["cash"],
      rothConversionAmount: 0,
      rothConversionStartAge: 63,
      rothConversionEndAge: 72,
      assumedIraTaxRate: 0.22,
    };

    const result = runSimulation(scenario);
    const row = result.yearRows[0];
    expect(row.spendingFundedFrom.ira).toBeCloseTo(100_000, 2);
    expect(row.iraDistributionsActual).toBeCloseTo(100_000 / (1 - 0.22), 1);
  });
});
