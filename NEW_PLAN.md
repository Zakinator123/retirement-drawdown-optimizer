Your motivation/goal

Build a “big picture” retirement drawdown planner that helps a user answer practical questions like:
“How much Roth conversion should I do, and for how many years?”
“Which withdrawal strategy is best for me?”
“Will I have enough money, and what can I safely spend?”
“What happens if I add a few high-expense years (roof, college help, new car, long-term care)?”
“When should I start Social Security, and how does that interact with conversions and taxes?”
Keep the simulation simple enough to understand and fast enough to run in-browser on the main thread, given typical horizons (30–70 years).
Still be auditable and explainable, especially around taxes: not just “tax total”, but “what created the taxes” and “what paid them”.
Intended audience

Primary: individuals/couples planning retirement, DIY investors.
Secondary: “advisor-style” usage where the operator wants auditability and drilldowns (without requiring IRS-perfect tax law).
Non-goals (v1)

Not aiming for 99.9999th percentile realism.
Not doing monthly/mid-year timing, no Monte Carlo yet.
Not full tax law coverage; we’ll build in extension points so you can add fidelity later.
1) High-level architecture (from-scratch TS/React/shadcn)
Core principle

Separate simulation engine (pure TypeScript, deterministic) from UI (React/shadcn). The UI never implements financial math; it only renders results and triggers runs.
Recommended project shape

engine/ (pure TS)
Scenario model (inputs), policies, mechanics, tax module(s), Social Security module(s)
Ledger + aggregations + optimizers
ui/ (React + TS + shadcn)
Scenario builder, results views, tables, drilldowns, optimization UI
shared/ (optional)
zod schemas, versions, serialization helpers
You can implement as:

A Next.js app with an internal engine package, or
A Vite React app with engine in src/engine.
Either is fine; the design below doesn’t depend on the framework.

2) Simulation philosophy and timing (explicit, simple, conservative)
You chose:

cashflows then growth
taxes paid at end of year from a chosen account order
annual timestep only
2.1 Annual timeline (v1 default)
For each simulation year y (age A):

Compute spending need

Base spending (today’s dollars) × inflation to year y
Apply go-go/slow-go/no-go phase multiplier
Add any one-off high expense items scheduled for that year/age
Apply Social Security cash inflow (if claimed)

Adds cash available for spending (reduces how much you must withdraw)
Plan discretionary withdrawals (absent RMD rule)

Withdraw from accounts according to the user’s withdrawal strategy to fund:
remaining spending need (net cash)
and end-of-year taxes (because you said IRA distributions used to pay taxes should count toward “planned IRA distributions”)
Compute RMD requirement

Based on prior year end IRA balance and age (Uniform Lifetime Table)
RMD applies to IRA distributions, not Roth conversions
Apply RMD constraint and forced distribution

If rmdRequiredGross > plannedIraDistributionsGross, force extra IRA distribution:
rmdForcedGross = rmdRequiredGross - plannedIraDistributionsGross
Compute taxes owed and pay taxes at EOY

Compute ordinary + cap gains taxes (including Social Security taxability)
Pay from user-selected order (e.g. cash → taxable → IRA)
Because tax payments can create additional taxable income (IRA distributions; realized gains), this step requires a small fixed-point iteration (details below)
Reinvest any RMD-caused surplus

If forced distributions caused excess cash after spending and taxes, reinvest to taxable (and treat as basis)
Apply growth

Apply annual growth to remaining end-of-year balances
Emit:

End-of-year balances
A full YearRow for the table
Ledger entries for every material movement / tax accrual / tax payment
This is conservative and easy to explain, and it keeps the door open for adding other timing modes later without rewriting.

3) Data model (inputs): scenario + policy + assumptions
3.1 Scenario (single person, single portfolio; spouse-ready later)
Even though v1 is single person, store as a “household” with one member so spouse can be added later without redesign.

Household

members: [ { id, birthYear?, startAge } ] (v1 length = 1)
filingStatus: "single" (v1 fixed; later allow MFJ)
Portfolio accounts (v1)

traditionalIra: { balance }
rothIra: { balance }
taxable: { marketValue, basisValue } (basisValue initialized from blended basis %)
cash: { balance }
Economic assumptions

inflationRate (also used as SS COLA in v1)
investmentReturn (single annual rate for IRA/Roth/Taxable)
cashReturn (optional; can be 0 in v1 to simplify further)
Tax assumptions (v1)

ordinaryIncomeRate (flat)
capGainsRate (flat)
assumedEffectiveIraRate slider (used for TANW metric; not for annual tax mechanics)
3.2 Spending model (go-go/slow-go/no-go + one-offs)
Inputs

baseAnnualSpendingToday
spendingPhases: [{ fromAge, toAge, multiplier, label }]
oneOffExpenses: [{ atAge, amountToday, note }] (or by calendar year)
Output each year

spendingNeedNominal
spendingComponents (for explainability in UI)
3.3 Policies (choices the user/optimizer toggles)
withdrawalOrder (enumerated; e.g. cash→taxable→ira→roth)
rothConversionPolicy:
annualConversionAmount (or 0)
startAge, endAge
taxPaymentOrder (you specified this explicitly; separate from spending withdrawal order)
e.g. cash → taxable → IRA
cashBufferRule (optional constraint)
e.g. “don’t take cash below $X unless unavoidable”
4) Ledger: the backbone for “taxes: sources and payers” + drilldowns
The ledger is an event log (not full double-entry accounting) optimized for:

clean table columns
easy slicing/dicing
drilldown explainability (“why is this number what it is?”)
4.1 LedgerEntry (core shape)
Each entry should minimally include:

runId, yearIndex, age
phase (e.g. "spending" | "conversion" | "rmd" | "taxSettlement" | "growth")
type (see below)
amountGross and optionally amountNet
accountFrom?, accountTo?
tax (amounts associated with the entry, if any):
ordinary
capGains
(optional later: ST/LT split, NIIT, state)
tags (critical):
purpose: "spending" | "tax" | "conversion" | "rmd" | "reinvest" | "income"
attribution: "iraDistribution" | "taxableSale" | "ss" | "interest" | "conversion" | ..."
payer: which account paid a tax bill (for TaxPayment)
source: which mechanism created a tax (for TaxAccrual)
4.2 Event types (v1)
IncomeReceived (e.g. Social Security gross → cash)
Withdrawal
Deposit (reinvest RMD surplus to taxable, etc.)
Transfer (e.g. IRA → Roth principal move for conversion)
TaxAccrual (records owed taxes by category + attribution)
TaxPayment (records paid taxes by category + payer account)
Growth (optional as ledger, or as separate computed fields; useful for audit)
4.3 Why this ledger design matters for your UI
From ledger entries, the UI can produce:

taxes owed by type and attribution (what created them)
taxes paid by payer account (what paid them)
spending funded by account (net)
IRA activity totals
RMD forced vs planned
drilldowns for any cell (filter by year + tags)
This is what makes the “data-rich table” reliable and maintainable.

5) YearRow: UI-ready “main table” data (no UI recomputation)
Your main table should be fed by a YearRow[] where every column is explicit and reconciled, including:

5.1 Balances (end-of-year)
iraEnd, rothEnd, taxableEnd, cashEnd
5.2 Spending
spendingNeed
spendingFundedNet:
fromCashNet, fromTaxableNet, fromIraNet, fromRothNet
spendingShortfall
5.3 Taxes (owed/accrued)
taxOwedOrdinary
taxOwedCapGains
taxOwedTotal
(Optional UI columns later: ssTaxable, etc.)
5.4 Taxes (paid/cashflow)
taxPaidFromCashGross
taxPaidFromTaxableGross
taxPaidFromIraGross
taxPaidTotalGross
5.5 IRA / RMD / conversion (the metrics you actually care about)
Replace “rmdTaken” with forced-vs-planned framing:

rmdRequiredGross
iraDistributionsPlannedGross (includes IRA used for spending + IRA used to pay taxes)
rmdForcedGross = max(0, rmdRequiredGross - iraDistributionsPlannedGross)
iraDistributionsActualGross = iraDistributionsPlannedGross + rmdForcedGross
rmdSurplusNetReinvested (if forced distributions cause surplus after spending+tax)
Conversions:

rothConversionGross (does not count toward RMD)
5.6 Social Security fields (for “start age” comparisons)
ssGross
ssTaxable
provisionalIncome (optional but very useful for drilldown/explainability)
5.7 Valuation metric by age (TANW)
Each year:

tanw (Tax-Adjusted Net Worth)
optionally: iraAfterTaxValue, taxableAfterTaxValue, etc. for transparency
6) Core calculations and mechanics (v1 formulas)
6.1 Taxable account with blended basis %
Maintain:

taxableMarketValue
taxableBasisValue
Then:

gainPct = max(0, (market - basis) / market) (if market > 0)
When you sell gross:

realizedGain = gross * gainPct
capGainsTax = realizedGain * capGainsRate
netCash = gross - capGainsTax
Update:
market -= gross
basis -= gross * (basis / priorMarket) (i.e., remove basis proportionally)
To raise a target net cash from taxable:

grossNeeded = netTarget / (1 - gainPct * capGainsRate)
clamp to available market value
6.2 IRA distributions to raise net cash
To raise net cash netTarget:

grossNeeded = netTarget / (1 - ordinaryIncomeRate)
ordinary tax owed increases by grossNeeded * ordinaryIncomeRate
(But note: because you pay taxes EOY, the “gross-up” approach may be used only for planning; the final taxes are computed in the iterative settlement.)
6.3 Roth conversion
Conversion of convGross:

Ledger:
Transfer from IRA to Roth for convGross tagged purpose:conversion
TaxAccrual ordinary tax attributable to conversion (v1: convGross * ordinaryIncomeRate, but see iteration)
IRA decreases, Roth increases; no cash created.
6.4 RMD computation (constraint)
rmdRequiredGross = priorYearIraEnd / divisor(age) (Uniform Lifetime Table)
Conversions do not count toward satisfying RMD.
Only IRA distributions (gross) count.
Your key metric:

rmdForcedGross = max(0, rmdRequiredGross - iraDistributionsPlannedGross)
6.5 Social Security (inputs and COLA)
Inputs:

ssAnnualBenefitToday
ssClaimAge
COLA = inflation
If age >= ssClaimAge:

ssGross = ssAnnualBenefitToday * (1 + inflation)^yearIndex
Else 0.
Ledger:

IncomeReceived → cash
6.6 Social Security taxable portion (Option B, single filer v1)
No tax-exempt interest; so:

provisionalIncome = taxableIncomeExclSS + 0.5 * ssGross
Where taxableIncomeExclSS includes (v1):

IRA distributions (gross)
Roth conversions (gross)
realized capital gains (note: gains are not ordinary income, but they can matter for “AGI excluding SS” depending on fidelity; for v1 we’ll treat “taxableIncomeExclSS” as a MAGI-ish proxy used solely for SS taxability and document it)
any other future ordinary income streams
Compute ssTaxable using the standard single thresholds (25k/34k) and the usual 0/50/85% formula, capped at 0.85 * ssGross.

Ledger:

TaxAccrual tagged attribution:ss for ordinary tax applied to ssTaxable
This gives you the “SS claiming age affects taxes” effect you want.

7) End-of-year tax settlement: why it must iterate (but remains simple)
You chose: “pay taxes at end of year from chosen account order”.

Issue: paying taxes from taxable (realized gains) or IRA (ordinary income) changes taxable income, which can:

increase taxes
increase taxable SS (via provisional income)
This creates a circular dependency.
7.1 Fixed-point iteration approach (bounded, fast)
Per year, do:

Initialize taxPaymentPlan = { fromCash:0, fromTaxable:0, fromIra:0 }

Repeat up to maxIter = 5:

Compute all tax bases from the year’s non-tax-payment events + current taxPaymentPlan (because the plan implies additional sales/distributions)
Compute:
taxOwedOrdinary (includes taxable SS, IRA distributions, conversions, etc.)
taxOwedCapGains (from realized gains, including those from taxable sales used to pay taxes)
Determine remaining tax bill T = taxOwedTotal - taxPaidAlready (v1: assume no prepayments; it’s all due now)
Allocate payments according to taxPaymentOrder:
withdraw/sell from accounts to raise T cash net (with gross-up mechanics)
update taxPaymentPlan
Stop when |T_new - T_old| < tolerance and payment amounts stabilize.
Ledger strategy:

Either record only final-settlement entries, or record interim attempts tagged iteration and hide them in UI by default.
This iteration is computationally cheap for 30–70 years and keeps the model consistent enough to avoid obvious SS/tax circularity errors.

8) Optimization plan (pragmatic, main-thread-friendly)
You want answers like “what conversion amount and for how long” and “which withdrawal order”.

8.1 Objective metric: TANW by age (not one-year IRA liquidation)
You correctly pointed out: the IRA will never be fully withdrawn in one year, so “after-tax wealth” should not imply that.

Define TANW (Tax-Adjusted Net Worth) as a valuation lens, computed each year:

iraAfterTax = iraBalance * (1 - assumedEffectiveIraRate) (separate slider)
taxableAfterTax = taxableMarketValue - unrealizedGain * capGainsRate
unrealizedGain = taxableMarketValue - taxableBasisValue
rothAfterTax = rothBalance
cashAfterTax = cashBalance
tanw = sum
You will:

display tanw by age in results
pick a target age (end age) and optimize tanw(targetAge)
optionally also show tanw at multiple ages (e.g., 65/75/85/95) for “path sensitivity”
8.2 Constraints and penalties (big-picture safety)
Optimization scoring should include penalties for:

spending shortfalls (large penalty)
breaking minimum cash buffer (optional penalty)
negative balances (hard fail)
8.3 Roth conversion optimization (simple grid)
Search space:

conversion amount: 0..X in steps (e.g., 0–200k, step 5k)
conversion end age: start..start+N (or user-defined window)
Return:

best candidate
top N candidates with key deltas
sensitivity table (conversion amount vs score; end age vs score)
optional “why”: identify years where tax/SS interactions drove differences (compare YearRows)
8.4 Withdrawal order comparison
Enumerate a small list of meaningful strategies and rank by:

tanw(targetAge)
and also by “max shortfall” / “years of shortfall” if you want
8.5 Social Security claiming age comparison
Discrete grid: claim age 62–70.
For each claim age:

run simulation
compute metrics (tanw(targetAge), total taxes, shortfall risk)
show a comparison table + click-through traces
This stays main-thread viable.

9) UI plan (React + shadcn) with “data-rich table” as the center
9.1 Key UX principles
The user should always be able to answer: “why is this number what it is?”
Every major number in the table/charts has a drilldown path to ledger entries.
9.2 Main screens (v1)
Scenario Builder

Accounts: IRA/Roth/Taxable/Cash starting balances
Assumptions: returns, inflation, tax rates, assumedEffectiveIraRate
Spending: base spending + go/slow/no-go editor + one-off expense list editor
Social Security: claim age + annual benefit (today’s dollars)
Policies: withdrawal order, conversion amount + window, tax payment order
Results

Summary cards: final balances, tanw at end age, total taxes, worst shortfall year, etc.
Charts: balances over time, taxes over time, tanw over time
Yearly table (TanStack Table) with grouped headers, similar to your current layout but richer and cleaner
Cell Drilldown Drawer

When you click a table cell (e.g. “Tax paid from Taxable at age 74”), show:
relevant ledger entries for that year + that concept (filtered by tags)
a mini reconciliation summary
optional “explain” text (“Paid from taxable because cash buffer rule prevented cash dipping below $X”)
Optimize

Roth conversion grid run with progress indicator
Output: best candidate + top N + sensitivity table
Click a candidate: load it into trace mode and show full results
9.3 Table design considerations (to avoid bloat but keep richness)
Keep the main table to ~20–30 columns max, grouped into:
Balances
Spending
Taxes owed
Taxes paid (by payer)
IRA/RMD/Conversion
SS summary
TANW
Use:
column visibility toggles
tooltips on headers
drilldown drawers for details rather than adding 50 columns
9.4 Export
Export YearRow[] to CSV
Export ledger entries (JSON + CSV) for audit/debugging
10) Engineering details (extensibility without complexity)
10.1 Engine API surface (stable contracts)
runScenario(input: ScenarioInput, policy: Policy): SimulationResult
runOptimization(input, optimizationSpec): OptimizationResult
SimulationResult contains:

yearRows: YearRow[]
ledger: LedgerEntry[]
summary: SummaryMetrics
indices for drilldowns (entry ids per year/type/tag)
10.2 Determinism and versioning
Add schemaVersion to scenario inputs/outputs
Use zod validation at the boundary (UI → engine) so the engine never sees malformed data
10.3 Spouse-ready later (without implementing now)
Keep household.members[] and a filing status field
Design SS as an “income stream module” that can later become per-member
Keep the tax module interface able to switch thresholds for MFJ later
11) Testing and validation (right-sized but trust-building)
Unit tests (must-have)

taxable sale math with blended basis (gross/net, basis reduction)
RMD computation and forced-vs-planned metrics
SS taxable portion formula (for a set of known cases)
end-of-year tax iteration convergence (stops, stable, bounded)
Scenario golden tests

A few fixed scenarios where you snapshot key YearRow columns
Not to prove “IRS correctness”, but to prevent regressions
Reconciliation checks (dev-only diagnostics)
Per year:

begin + inflows - outflows + growth ≈ end for each account (tolerance)
spendingNeed = sum(spendingFundedNet) + shortfall
taxOwed ≈ taxPaid (since you pay all EOY in-model)
Expose these in a “Diagnostics” panel or hidden table columns.

12) Milestones (practical build order)
Milestone 1: Engine MVP

Annual timeline cashflows→EOY taxes→growth
4 accounts, blended basis, flat tax rates
SS claim age + IRS-style taxable portion (Option B)
Forced-vs-planned RMD metrics
TANW by age metric
Milestone 2: UI MVP

Scenario builder
Results table + drilldowns (ledger-backed)
Exports
Milestone 3: Optimization MVP

Roth conversion grid (amount + end age)
SS claim age grid (62–70)
Withdrawal order comparison
Milestone 4: Quality + polish

Better charts, comparisons, “driver years”
More constraints (cash buffer, max conversion, etc.)
Start laying groundwork for spouse + Medicare/IRMAA as optional modules (still off by default)
13) Final notes (so the tool stays aligned with “big picture”)
The ledger + YearRow approach is what keeps the tool “advisor-grade” in explainability even if tax law fidelity is simplified.
TANW is explicitly a valuation lens; it avoids the misleading “IRA liquidated in one year” assumption while still allowing optimization.
The only “complex” thing we’re keeping is the bounded EOY tax iteration—because without it, SS taxability interactions will be wrong in common cases.
