import { runSimulation } from "./simulation";
import { AccountType, Scenario } from "./types";

export interface WithdrawalStrategyResult {
  label: string;
  order: AccountType[];
  tanw: number;
  totalTaxes: number;
  finalTotal: number;
}

export interface WithdrawalComparisonResult {
  strategies: WithdrawalStrategyResult[];
  best: WithdrawalStrategyResult;
  worst: WithdrawalStrategyResult;
  current: WithdrawalStrategyResult | null;
}

const WITHDRAWAL_ORDERS: Array<{ label: string; order: AccountType[] }> = [
  { label: "Cash → Taxable → IRA → Roth", order: ["cash", "taxable", "ira", "roth"] },
  { label: "Cash → IRA → Taxable → Roth", order: ["cash", "ira", "taxable", "roth"] },
  { label: "Cash → Taxable → Roth → IRA", order: ["cash", "taxable", "roth", "ira"] },
  { label: "Cash → IRA → Roth → Taxable", order: ["cash", "ira", "roth", "taxable"] },
  { label: "Cash → Roth → Taxable → IRA", order: ["cash", "roth", "taxable", "ira"] },
  { label: "Cash → Roth → IRA → Taxable", order: ["cash", "roth", "ira", "taxable"] },
  { label: "IRA → Cash → Taxable → Roth", order: ["ira", "cash", "taxable", "roth"] },
  { label: "IRA → Taxable → Cash → Roth", order: ["ira", "taxable", "cash", "roth"] },
  { label: "IRA → Cash → Roth → Taxable", order: ["ira", "cash", "roth", "taxable"] },
  { label: "Taxable → Cash → IRA → Roth", order: ["taxable", "cash", "ira", "roth"] },
  { label: "Taxable → IRA → Cash → Roth", order: ["taxable", "ira", "cash", "roth"] },
  { label: "Roth → Cash → Taxable → IRA", order: ["roth", "cash", "taxable", "ira"] },
];

export function compareWithdrawalStrategies(
  scenario: Scenario
): WithdrawalComparisonResult {
  const strategies: WithdrawalStrategyResult[] = [];
  let best: WithdrawalStrategyResult | null = null;
  let worst: WithdrawalStrategyResult | null = null;
  let current: WithdrawalStrategyResult | null = null;

  const currentOrderKey = scenario.withdrawalOrder.join(",");

  for (const { label, order } of WITHDRAWAL_ORDERS) {
    const candidate: Scenario = {
      ...scenario,
      withdrawalOrder: order,
    };
    const result = runSimulation(candidate);
    
    const strategyResult: WithdrawalStrategyResult = {
      label,
      order,
      tanw: result.summary.finalTanw,
      totalTaxes: result.summary.totalTaxesPaid,
      finalTotal: result.summary.finalTotal,
    };
    
    strategies.push(strategyResult);

    if (!best || strategyResult.tanw > best.tanw) {
      best = strategyResult;
    }
    if (!worst || strategyResult.tanw < worst.tanw) {
      worst = strategyResult;
    }
    if (order.join(",") === currentOrderKey) {
      current = strategyResult;
    }
  }

  // Sort by TANW descending
  strategies.sort((a, b) => b.tanw - a.tanw);

  return {
    strategies,
    best: best!,
    worst: worst!,
    current,
  };
}

