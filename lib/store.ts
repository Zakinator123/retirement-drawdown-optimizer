import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";

enableMapSet();

import {
  OptimizationResult,
  Scenario,
  SimulationResult,
  runSimulation as engineRunSimulation,
} from "./engine";
import { DEFAULT_SCENARIO } from "./defaults";
import {
  compareSsClaimAges,
  compareWithdrawalOrders,
  optimizeRothConversion,
} from "./engine/optimize";

interface AppState {
  scenario: Scenario;
  results: SimulationResult | null;
  optimizationResults: OptimizationResult | null;
  isSimulating: boolean;
  expandedYearRows: Set<number>;

  updateScenario: (partial: Partial<Scenario>) => void;
  runSimulation: () => void;
  runOptimization: (type: "conversion" | "withdrawal" | "ss") => void;
  toggleYearRowExpanded: (yearIndex: number) => void;
  applyOptimizedScenario: (scenario: Scenario) => void;
}

export const useStore = create<AppState>()(
  immer((set, get) => ({
    scenario: DEFAULT_SCENARIO,
    results: null,
    optimizationResults: null,
    isSimulating: false,
    expandedYearRows: new Set(),

    updateScenario: (partial) => {
      set((state) => {
        Object.assign(state.scenario, partial);
      });
      get().runSimulation();
    },

    runSimulation: () => {
      const { scenario } = get();
      const results = engineRunSimulation(scenario);
      set({ results });
    },

    runOptimization: (type) => {
      set({ isSimulating: true });
      const { scenario } = get();
      let optimizationResults: OptimizationResult;

      switch (type) {
        case "conversion":
          optimizationResults = optimizeRothConversion(scenario, {
            amountRange: [0, 300000],
            amountStep: 5000,
            endAgeRange: [scenario.rothConversionStartAge, 80],
          });
          break;
        case "withdrawal":
          optimizationResults = compareWithdrawalOrders(scenario);
          break;
        case "ss":
          optimizationResults = compareSsClaimAges(scenario);
          break;
      }

      set({ optimizationResults, isSimulating: false });
    },

    toggleYearRowExpanded: (yearIndex) => {
      set((state) => {
        if (state.expandedYearRows.has(yearIndex)) {
          state.expandedYearRows.delete(yearIndex);
        } else {
          state.expandedYearRows.add(yearIndex);
        }
      });
    },

    applyOptimizedScenario: (scenario) => {
      set({ scenario, optimizationResults: null });
      get().runSimulation();
    },
  })),
);
