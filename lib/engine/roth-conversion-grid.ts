 import { runSimulation } from "./simulation";
import { Scenario } from "./types";

export interface RothConversionGridCell {
  amount: number;
  endAge: number;
  tanw: number;
}

export interface RothConversionGridResult {
  cells: RothConversionGridCell[];
  amounts: number[];
  endAges: number[];
  minTanw: number;
  maxTanw: number;
  bestCell: RothConversionGridCell;
  currentCell: RothConversionGridCell | null;
}

export interface RothConversionGridOptions {
  amountMin?: number;
  amountMax?: number;
  amountStep?: number;
  endAgeMin?: number;
  endAgeMax?: number;
  endAgeStep?: number;
}

export function computeRothConversionGrid(
  scenario: Scenario,
  options: RothConversionGridOptions = {}
): RothConversionGridResult {
  const {
    amountMin = 0,
    amountMax = 300_000,
    amountStep = 15_000,
    endAgeMin = scenario.startAge,
    endAgeMax = Math.min(scenario.endAge, 85),
    endAgeStep = 2,
  } = options;

  const amounts: number[] = [];
  const endAges: number[] = [];
  const cells: RothConversionGridCell[] = [];

  // Build amount array
  for (let amount = amountMin; amount <= amountMax; amount += amountStep) {
    amounts.push(amount);
  }

  // Build endAge array
  for (let endAge = endAgeMin; endAge <= endAgeMax; endAge += endAgeStep) {
    endAges.push(endAge);
  }

  let minTanw = Infinity;
  let maxTanw = -Infinity;
  let bestCell: RothConversionGridCell = { amount: 0, endAge: endAgeMin, tanw: 0 };
  let currentCell: RothConversionGridCell | null = null;

  // Run simulations for each combination
  for (const amount of amounts) {
    for (const endAge of endAges) {
      const candidate: Scenario = {
        ...scenario,
        rothConversionAmount: amount,
        rothConversionEndAge: endAge,
      };
      const result = runSimulation(candidate);
      const tanw = result.summary.finalTanw;

      const cell: RothConversionGridCell = { amount, endAge, tanw };
      cells.push(cell);

      if (tanw < minTanw) minTanw = tanw;
      if (tanw > maxTanw) {
        maxTanw = tanw;
        bestCell = cell;
      }

      // Check if this matches current scenario settings
      if (
        amount === scenario.rothConversionAmount &&
        endAge === scenario.rothConversionEndAge
      ) {
        currentCell = cell;
      }
    }
  }

  return {
    cells,
    amounts,
    endAges,
    minTanw,
    maxTanw,
    bestCell,
    currentCell,
  };
}

