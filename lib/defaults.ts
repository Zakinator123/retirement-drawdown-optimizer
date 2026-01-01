import { Scenario } from "./engine";

export const DEFAULT_SCENARIO: Scenario = {
  startAge: 62,
  endAge: 95,
  iraBalance: 2_000_000,
  rothBalance: 0,
  taxableBalance: 500_000,
  taxableBasisValue: 250_000,
  cashBalance: 200_000,
  investmentReturn: 0.07,
  cashReturn: 0.03,
  inflationRate: 0.03,
  ordinaryIncomeRate: 0.22,
  capitalGainsRate: 0.15,
  spendingPhases: [
    { fromAge: 62, toAge: 95, annualAmount: 100_000, label: "Base" },
  ],
  oneOffExpenses: [],
  ssAnnualBenefit: 36_000,
  ssClaimAge: 67,
  ssEnabled: true,
  withdrawalOrder: ["cash", "taxable", "ira", "roth"],
  taxPaymentOrder: ["cash", "taxable", "ira"],
  rothConversionAmount: 50_000,
  rothConversionStartAge: 63,
  rothConversionEndAge: 72,
  assumedIraTaxRate: 0.22,
};
