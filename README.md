# Retirement Drawdown Optimizer (Rebuild)

This project is a full rebuild of the retirement drawdown optimizer. The goal is to move from a proof‑of‑concept (in `poc/`) to a cleanly separated, testable TypeScript simulation engine with a modern Next.js UI. The rebuild follows the implementation plan in `.cursor/plans/retirement_optimizer_rebuild_88fc8727.plan.md`.

The result:
- A pure TypeScript engine (`lib/engine/`) that calculates year‑by‑year cash flows, taxes, RMDs, and Social Security.
- A ledger system that logs all cash movements for auditability and UI transparency.
- A React/Next.js UI with shadcn‑style components and slider‑driven inputs.
- Expandable yearly rows that show a compact ledger table.
- Optimization helpers to explore withdrawal order, Roth conversions, and SS claim ages.

---

## Motivation

The POC combined UI and calculations, which made the logic harder to test and evolve. This rebuild separates the calculation engine from the UI, making it:
- Easier to test and reason about.
- Easier to extend with new rules or new UI.
- Ready for future use in Web Workers or other environments.

---

## Architecture Overview

The architecture mirrors the rebuild plan:

```
UI (Next.js + shadcn-style) -> Zustand Store -> Simulation Engine
                                             -> Optimizers (compare scenarios)
```

Key layers:
- **Engine (lib/engine)**: Pure TypeScript. No React/DOM dependencies.
- **State (lib/store.ts)**: Zustand store that holds the scenario and latest results.
- **UI (components + app)**: Sliders, charts, tables, and layout.

---

## Project Layout

```
app/
  layout.tsx          # Root layout, metadata, fonts
  page.tsx            # Main page: controls + charts + yearly table
components/
  layout/             # Header and main layout
  scenario/           # Input cards (sliders)
  results/            # Summary cards, charts, year table
  optimize/           # Optimization panel and sensitivity chart
  ui/                 # shadcn-style primitives (card, table, slider, etc.)
lib/
  engine/             # Simulation engine (types, tax, SS, RMD, optimize)
  defaults.ts         # Default scenario values
  format.ts           # Formatting helpers
  store.ts            # Zustand store
poc/                  # Legacy proof-of-concept (reference only)
```

---

## Engine Layer (lib/engine)

### Types
`lib/engine/types.ts` defines all core data shapes:
- `Scenario`: all user inputs (ages, balances, spending, SS, tax assumptions).
- `YearRow`: UI-ready year data with balances, taxes, spending sources, etc.
- `LedgerEntry`: transaction log entries.
- `SimulationResult`: full simulation output (rows + ledger + summary).

### Calculators
- `lib/engine/rmd.ts`: Uniform Lifetime Table logic for RMDs.
- `lib/engine/social-security.ts`: Claim age adjustment + taxable SS calculation.
- `lib/engine/tax.ts`: Flat effective ordinary + capital gains tax model.

### Ledger
`lib/engine/ledger.ts` provides `createLedgerEntry`, used to record all movements:
spending withdrawals, tax payments, conversions, growth, and reinvestment.

### Simulation
`lib/engine/simulation.ts` orchestrates the annual loop:
1. Apply investment and cash returns.
2. Compute spending needs.
3. Apply Social Security income (if enabled).
4. Calculate RMD requirement.
5. Withdraw funds based on chosen order.
6. Apply Roth conversion.
7. Calculate and pay taxes.
8. Reinvest excess RMD net cash into taxable.
9. Build `YearRow` + ledger entries.

### Optimization
`lib/engine/optimize.ts` compares:
- Withdrawal orders.
- SS claim ages.
- Roth conversion schedules.

Scores are based on final TANW (tax‑adjusted net worth).

---

## State Layer (Zustand)

`lib/store.ts` holds:
- Current `scenario`.
-,Latest `results` from the engine.
- Optimization results.
- Expansion state for the yearly ledger rows.

Any scenario change triggers a new simulation run.

---

## UI Layer (Next.js + components)

### Inputs (left / top column)
All numeric inputs are sliders for fast experimentation. Cards are compact and arranged in a two-column grid above the yearly table.

Key components:
- `components/scenario/account-balances-form.tsx`
- `components/scenario/simulation-range-form.tsx`
- `components/scenario/economic-assumptions-form.tsx`
- `components/scenario/spending-form.tsx`
- `components/scenario/social-security-form.tsx`
- `components/scenario/strategy-form.tsx`

### Results
- `components/results/summary-cards.tsx`: ending values for each account + totals.
- `components/results/year-table/year-table.tsx`: yearly breakdown table with expandable rows.
- `components/results/year-table/ledger-entries-view.tsx`: compact ledger table per year.

### Charts
Recharts visualizations:
- Balances over time
- Spending source breakdown
- Taxes over time
- TANW over time

Each chart includes horizontal gridlines via `CartesianGrid`.

### Optimization
`components/optimize/optimize-panel.tsx` runs comparisons and shows:
- Best result (TANW).
- Sensitivity chart for variants.
- Variant list (hidden if all variants yield identical scores).

---

## How the Plan Was Implemented

The rebuild plan in `.cursor/plans/retirement_optimizer_rebuild_88fc8727.plan.md` is implemented as follows:

### Engine Core
- `lib/engine/types.ts`: Scenario, YearRow, LedgerEntry, SimulationResult
- `lib/engine/rmd.ts`: RMD calculator
- `lib/engine/social-security.ts`: SS benefits + taxability
- `lib/engine/tax.ts`: tax calculator
- `lib/engine/ledger.ts`: ledger entry helper
- `lib/engine/simulation.ts`: main simulation loop
- `lib/engine/optimize.ts`: optimization functions
- `lib/engine/index.ts`: exports

### State and Utilities
- `lib/store.ts`: Zustand store + simulation integration
- `lib/format.ts`: currency/percent formatters
- `lib/defaults.ts`: default scenario values

### UI Components
- Scenario forms under `components/scenario/`
- Summary cards under `components/results/summary-cards.tsx`
- Yearly table + ledger expansion under `components/results/year-table/`
- Charts under `components/results/charts/`
- Optimization under `components/optimize/`
- Layout in `components/layout/` and `app/page.tsx`

### Testing
Engine unit tests are in `lib/engine/__tests__` (Vitest):
- `rmd.test.ts`
- `social-security.test.ts`
- `tax.test.ts`
- `withdrawal.test.ts`
- `simulation.test.ts`
- `optimize.test.ts`

---

## Running Locally

Install dependencies:
```
pnpm install
```

Run the dev server:
```
pnpm dev
```

Run tests:
```
pnpm test
```

---

## Notes and Design Decisions

- **Effective Tax Rates**: The engine uses flat effective tax rates (ordinary + cap gains) to keep the model transparent and easy to test.
- **Slider UI**: Inputs are slider‑based for quick tuning; values are displayed alongside.
- **Ledger Transparency**: Every movement is recorded as a ledger entry so users can inspect how a year was funded.
- **SS Toggle**: Social Security can be disabled and the form collapses to simplify scenarios without SS income.
- **Compact Layout**: Controls are arranged in two columns above the yearly table, with charts to the right for live visual feedback.
- **shadcn Slider**: A lightweight range input slider is used (`components/ui/slider.tsx`). It supports single and dual‑knob ranges.

---

## POC Reference

The original proof‑of‑concept is still in `poc/`. It is not used by the rebuild, but kept for reference.

