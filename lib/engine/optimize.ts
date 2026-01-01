import { runSimulation } from "./simulation";
import { AccountType, OptimizationResult, Scenario } from "./types";

interface ConversionOptimizationOptions {
  amountRange: [number, number];
  amountStep: number;
  endAgeRange: [number, number];
}

const COMMON_WITHDRAWAL_ORDERS: Array<{
  label: string;
  order: AccountType[];
}> = [
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

export function optimizeRothConversion(
  scenario: Scenario,
  options: ConversionOptimizationOptions,
): OptimizationResult {
  const variants: OptimizationResult["variants"] = [];
  let bestScenario = scenario;
  let bestScore = -Infinity;

  for (
    let amount = options.amountRange[0];
    amount <= options.amountRange[1];
    amount += options.amountStep
  ) {
    for (
      let endAge = options.endAgeRange[0];
      endAge <= options.endAgeRange[1];
      endAge += 1
    ) {
      const candidate: Scenario = {
        ...scenario,
        rothConversionAmount: amount,
        rothConversionEndAge: endAge,
      };
      const result = runSimulation(candidate);
      const score = result.summary.finalTanw;
      variants.push({
        label: `Convert $${amount.toLocaleString()} until age ${endAge}`,
        scenario: candidate,
        score,
      });
      if (score > bestScore) {
        bestScore = score;
        bestScenario = candidate;
      }
    }
  }

  return {
    type: "conversion",
    bestScenario,
    bestScore,
    variants,
  };
}

export function compareWithdrawalOrders(
  scenario: Scenario,
): OptimizationResult {
  const variants: OptimizationResult["variants"] = [];
  let bestScenario = scenario;
  let bestScore = -Infinity;

  for (const option of COMMON_WITHDRAWAL_ORDERS) {
    const candidate: Scenario = {
      ...scenario,
      withdrawalOrder: option.order,
    };
    const result = runSimulation(candidate);
    const score = result.summary.finalTanw;
    variants.push({
      label: option.label,
      scenario: candidate,
      score,
    });
    if (score > bestScore) {
      bestScore = score;
      bestScenario = candidate;
    }
  }

  return {
    type: "withdrawal",
    bestScenario,
    bestScore,
    variants,
  };
}

export function compareSsClaimAges(scenario: Scenario): OptimizationResult {
  const variants: OptimizationResult["variants"] = [];
  let bestScenario = scenario;
  let bestScore = -Infinity;

  for (let age = 62; age <= 70; age += 1) {
    const candidate: Scenario = {
      ...scenario,
      ssClaimAge: age,
    };
    const result = runSimulation(candidate);
    const score = result.summary.finalTanw;
    variants.push({
      label: `Claim at ${age}`,
      scenario: candidate,
      score,
    });
    if (score > bestScore) {
      bestScore = score;
      bestScenario = candidate;
    }
  }

  return {
    type: "ss",
    bestScenario,
    bestScore,
    variants,
  };
}
