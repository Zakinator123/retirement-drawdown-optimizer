import { createLedgerEntry } from "./ledger";
import { calculateRMD } from "./rmd";
import { calculateSSBenefit, calculateSSTaxable } from "./social-security";
import { calculateYearlyTax } from "./tax";
import {
  AccountType,
  LedgerEntry,
  Scenario,
  SimulationResult,
  SimulationState,
  YearRow,
} from "./types";

interface SpendingNeed {
  baseSpending: number;
  oneOffExpenses: number;
  totalBeforeIncome: number;
}

interface WithdrawalOutcome {
  fundedFrom: YearRow["spendingFundedFrom"];
  iraGross: number;
  taxableGross: number;
  taxableGains: number;
  taxOrdinary: number;
  taxCapGains: number;
  shortfall: number;
  entries: LedgerEntry[];
}

interface TaxPaymentOutcome {
  paidFrom: YearRow["taxPaidFrom"];
  iraGross: number;
  taxableGross: number;
  taxableGains: number;
  taxOrdinary: number;
  taxCapGains: number;
  remaining: number;
  entries: LedgerEntry[];
}

const emptyFundedFrom = () => ({
  cash: 0,
  taxable: 0,
  ira: 0,
  roth: 0,
});

const emptyTaxPaidFrom = () => ({
  cash: 0,
  taxable: 0,
  ira: 0,
});

function calculateSpendingNeed(
  scenario: Scenario,
  yearIndex: number,
  age: number,
): SpendingNeed {
  const inflationFactor = Math.pow(1 + scenario.inflationRate, yearIndex);
  const phase = scenario.spendingPhases.find(
    (item) => age >= item.fromAge && age <= item.toAge,
  );
  const baseSpending = (phase?.annualAmount ?? 0) * inflationFactor;
  const oneOffExpenses = scenario.oneOffExpenses
    .filter((item) => item.age === age)
    .reduce((sum, item) => sum + item.amount, 0);
  const oneOffInflated = oneOffExpenses * inflationFactor;
  return {
    baseSpending,
    oneOffExpenses: oneOffInflated,
    totalBeforeIncome: baseSpending + oneOffInflated,
  };
}

function withdrawForSpending(
  targetNet: number,
  order: AccountType[],
  state: SimulationState,
  scenario: Scenario,
  yearIndex: number,
  age: number,
): WithdrawalOutcome {
  let remaining = targetNet;
  const fundedFrom = emptyFundedFrom();
  const entries: LedgerEntry[] = [];
  let iraGross = 0;
  let taxableGross = 0;
  let taxableGains = 0;
  let taxOrdinary = 0;
  let taxCapGains = 0;

  for (const account of order) {
    if (remaining <= 0) break;
    if (account === "cash" && state.cash > 0) {
      const fromCash = Math.min(state.cash, remaining);
      state.cash -= fromCash;
      remaining -= fromCash;
      fundedFrom.cash += fromCash;
      if (fromCash > 0) {
        entries.push(
          createLedgerEntry({
            yearIndex,
            age,
            phase: "spending",
            type: "withdrawal",
            amountGross: fromCash,
            amountNet: fromCash,
            account: "cash",
            purpose: "spending",
            attribution: "cash_withdrawal",
            description: `Cash used for spending (no tax)`,
          }),
        );
      }
    }

    if (account === "roth" && state.roth > 0 && remaining > 0) {
      const fromRoth = Math.min(state.roth, remaining);
      state.roth -= fromRoth;
      remaining -= fromRoth;
      fundedFrom.roth += fromRoth;
      if (fromRoth > 0) {
        entries.push(
          createLedgerEntry({
            yearIndex,
            age,
            phase: "spending",
            type: "withdrawal",
            amountGross: fromRoth,
            amountNet: fromRoth,
            account: "roth",
            purpose: "spending",
            attribution: "roth_withdrawal",
            description: `Roth withdrawal for spending (tax-free)`,
          }),
        );
      }
    }

    if (account === "ira" && state.ira > 0 && remaining > 0) {
      const grossNeeded = remaining / (1 - scenario.ordinaryIncomeRate);
      const gross = Math.min(state.ira, grossNeeded);
      const net = gross * (1 - scenario.ordinaryIncomeRate);
      const tax = gross - net;
      state.ira -= gross;
      remaining -= net;
      fundedFrom.ira += net;
      iraGross += gross;
      taxOrdinary += tax;
      if (gross > 0) {
        entries.push(
          createLedgerEntry({
            yearIndex,
            age,
            phase: "spending",
            type: "withdrawal",
            amountGross: gross,
            amountNet: net,
            account: "ira",
            taxOrdinary: tax,
            purpose: "spending",
            attribution: "ira_distribution",
            description: `IRA withdrawal for spending (net after income tax withheld)`,
          }),
        );
      }
    }

    if (account === "taxable" && state.taxableMarket > 0 && remaining > 0) {
      const gainPct =
        state.taxableMarket > 0
          ? Math.max(0, (state.taxableMarket - state.taxableBasis) / state.taxableMarket)
          : 0;
      const effectiveRate = gainPct * scenario.capitalGainsRate;
      const grossNeeded = remaining / (1 - effectiveRate);
      const gross = Math.min(state.taxableMarket, grossNeeded);
      const net = gross * (1 - effectiveRate);
      const gain = gross * gainPct;
      const basisPortion = gross - gain;
      const tax = gain * scenario.capitalGainsRate;

      state.taxableMarket -= gross;
      state.taxableBasis = Math.max(0, state.taxableBasis - basisPortion);
      remaining -= net;
      fundedFrom.taxable += net;
      taxableGross += gross;
      taxableGains += gain;
      taxCapGains += tax;
      if (gross > 0) {
        entries.push(
          createLedgerEntry({
            yearIndex,
            age,
            phase: "spending",
            type: "withdrawal",
            amountGross: gross,
            amountNet: net,
            account: "taxable",
            taxCapGains: tax,
            purpose: "spending",
            attribution: "taxable_sale",
            description: `Taxable sale for spending (net after capital gains tax)`,
          }),
        );
      }
    }
  }

  return {
    fundedFrom,
    iraGross,
    taxableGross,
    taxableGains,
    taxOrdinary,
    taxCapGains,
    shortfall: Math.max(0, remaining),
    entries,
  };
}

function payTaxes(
  targetTax: number,
  order: AccountType[],
  state: SimulationState,
  scenario: Scenario,
  yearIndex: number,
  age: number,
): TaxPaymentOutcome {
  let remaining = targetTax;
  const paidFrom = emptyTaxPaidFrom();
  const entries: LedgerEntry[] = [];
  let iraGross = 0;
  let taxableGross = 0;
  let taxableGains = 0;
  let taxOrdinary = 0;
  let taxCapGains = 0;

  for (const account of order) {
    if (remaining <= 0) break;
    if (account === "cash" && state.cash > 0) {
      const fromCash = Math.min(state.cash, remaining);
      state.cash -= fromCash;
      remaining -= fromCash;
      paidFrom.cash += fromCash;
      if (fromCash > 0) {
        entries.push(
          createLedgerEntry({
            yearIndex,
            age,
            phase: "tax_settlement",
            type: "tax_payment",
            amountGross: fromCash,
            amountNet: fromCash,
            account: "cash",
            purpose: "tax",
            attribution: "cash_withdrawal",
            description: `Cash used to pay taxes (from cash reserves or prior income)`,
          }),
        );
      }
    }

    if (account === "taxable" && state.taxableMarket > 0 && remaining > 0) {
      const gainPct =
        state.taxableMarket > 0
          ? Math.max(0, (state.taxableMarket - state.taxableBasis) / state.taxableMarket)
          : 0;
      const effectiveRate = gainPct * scenario.capitalGainsRate;
      const grossNeeded = remaining / (1 - effectiveRate);
      const gross = Math.min(state.taxableMarket, grossNeeded);
      const net = gross * (1 - effectiveRate);
      const gain = gross * gainPct;
      const basisPortion = gross - gain;
      const tax = gain * scenario.capitalGainsRate;

      state.taxableMarket -= gross;
      state.taxableBasis = Math.max(0, state.taxableBasis - basisPortion);
      remaining -= net;
      paidFrom.taxable += gross;
      taxableGross += gross;
      taxableGains += gain;
      taxCapGains += tax;
      if (gross > 0) {
        entries.push(
          createLedgerEntry({
            yearIndex,
            age,
            phase: "tax_settlement",
            type: "tax_payment",
            amountGross: gross,
            amountNet: net,
            account: "taxable",
            taxCapGains: tax,
            purpose: "tax",
            attribution: "taxable_sale",
            description: `Taxable sale to raise cash for taxes (generates additional cap gains tax)`,
          }),
        );
      }
    }

    if (account === "ira" && state.ira > 0 && remaining > 0) {
      const grossNeeded = remaining / (1 - scenario.ordinaryIncomeRate);
      const gross = Math.min(state.ira, grossNeeded);
      const net = gross * (1 - scenario.ordinaryIncomeRate);
      const tax = gross - net;
      state.ira -= gross;
      remaining -= net;
      paidFrom.ira += gross;
      iraGross += gross;
      taxOrdinary += tax;
      if (gross > 0) {
        entries.push(
          createLedgerEntry({
            yearIndex,
            age,
            phase: "tax_settlement",
            type: "tax_payment",
            amountGross: gross,
            amountNet: net,
            account: "ira",
            taxOrdinary: tax,
            purpose: "tax",
            attribution: "ira_distribution",
            description: `IRA withdrawal to raise cash for taxes (generates additional income tax)`,
          }),
        );
      }
    }
  }

  return {
    paidFrom,
    iraGross,
    taxableGross,
    taxableGains,
    taxOrdinary,
    taxCapGains,
    remaining: Math.max(0, remaining),
    entries,
  };
}

function buildYearRow(params: {
  yearIndex: number;
  age: number;
  state: SimulationState;
  taxableBasis: number;
  spendingNeed: SpendingNeed;
  ssGross: number;
  spendingFundedFrom: YearRow["spendingFundedFrom"];
  spendingShortfall: number;
  tax: ReturnType<typeof calculateYearlyTax>;
  taxPaidFrom: YearRow["taxPaidFrom"];
  taxShortfall: number;
  iraDistributionsPlanned: number;
  rmdRequired: number;
  rmdForced: number;
  iraDistributionsActual: number;
  rmdSurplusReinvested: number;
  rothConversion: number;
  ssTaxable: number;
  growth: YearRow["growth"];
  scenario: Scenario;
}): YearRow {
  const totalEnd =
    params.state.ira +
    params.state.roth +
    params.state.taxableMarket +
    params.state.cash;
  const iraAfterTax =
    params.state.ira * (1 - params.scenario.assumedIraTaxRate);
  const taxableGains =
    params.state.taxableMarket > 0
      ? Math.max(0, params.state.taxableMarket - params.taxableBasis)
      : 0;
  const taxableAfterTax =
    params.state.taxableMarket - taxableGains * params.scenario.capitalGainsRate;
  const tanwComponents = {
    iraAfterTax,
    rothAfterTax: params.state.roth,
    taxableAfterTax,
    cashAfterTax: params.state.cash,
  };
  const tanw =
    tanwComponents.iraAfterTax +
    tanwComponents.rothAfterTax +
    tanwComponents.taxableAfterTax +
    tanwComponents.cashAfterTax;

  const spendingComponents = {
    baseSpending: params.spendingNeed.baseSpending,
    oneOffExpenses: params.spendingNeed.oneOffExpenses,
    totalBeforeIncome: params.spendingNeed.totalBeforeIncome,
    ssIncome: params.ssGross,
    netSpendingNeed: Math.max(
      0,
      params.spendingNeed.totalBeforeIncome - params.ssGross,
    ),
  };

  return {
    yearIndex: params.yearIndex,
    age: params.age,
    iraEnd: params.state.ira,
    rothEnd: params.state.roth,
    taxableEnd: params.state.taxableMarket,
    cashEnd: params.state.cash,
    totalEnd,
    spendingNeed: params.spendingNeed.totalBeforeIncome,
    spendingComponents,
    spendingFundedFrom: params.spendingFundedFrom,
    spendingShortfall: params.spendingShortfall,
    taxOwedOrdinary: params.tax.ordinaryIncome,
    taxOwedCapGains: params.tax.capitalGains,
    taxOwedTotal: params.tax.totalTax,
    taxSources: params.tax.sources,
    taxPaidFrom: params.taxPaidFrom,
    taxShortfall: params.taxShortfall,
    iraDistributionsPlanned: params.iraDistributionsPlanned,
    rmdRequired: params.rmdRequired,
    rmdForced: params.rmdForced,
    iraDistributionsActual: params.iraDistributionsActual,
    rmdSurplusReinvested: params.rmdSurplusReinvested,
    rothConversion: params.rothConversion,
    ssGross: params.ssGross,
    ssTaxable: params.ssTaxable,
    ssEffectiveRate: params.ssGross > 0 ? params.ssTaxable / params.ssGross : 0,
    growth: params.growth,
    tanw,
    tanwComponents,
  };
}

function computeSummary(yearRows: YearRow[]) {
  if (yearRows.length === 0) {
    return {
      finalTotal: 0,
      finalTanw: 0,
      totalTaxesPaid: 0,
      totalOrdinaryTax: 0,
      totalCapGainsTax: 0,
      totalConverted: 0,
      totalRmds: 0,
      totalSpendingShortfall: 0,
      worstShortfallYear: null,
    };
  }
  const final = yearRows[yearRows.length - 1];
  let totalTaxesPaid = 0;
  let totalOrdinaryTax = 0;
  let totalCapGainsTax = 0;
  let totalConverted = 0;
  let totalRmds = 0;
  let totalSpendingShortfall = 0;
  let worstShortfall = 0;
  let worstShortfallYear: number | null = null;

  yearRows.forEach((row) => {
    totalTaxesPaid += row.taxOwedTotal;
    totalOrdinaryTax += row.taxOwedOrdinary;
    totalCapGainsTax += row.taxOwedCapGains;
    totalConverted += row.rothConversion;
    totalRmds += row.rmdRequired;
    totalSpendingShortfall += row.spendingShortfall;
    if (row.spendingShortfall > worstShortfall) {
      worstShortfall = row.spendingShortfall;
      worstShortfallYear = row.age;
    }
  });

  return {
    finalTotal: final.totalEnd,
    finalTanw: final.tanw,
    totalTaxesPaid,
    totalOrdinaryTax,
    totalCapGainsTax,
    totalConverted,
    totalRmds,
    totalSpendingShortfall,
    worstShortfallYear,
  };
}

function groupLedgerByYear(ledger: LedgerEntry[]) {
  const map = new Map<number, LedgerEntry[]>();
  ledger.forEach((entry) => {
    const existing = map.get(entry.yearIndex) ?? [];
    existing.push(entry);
    map.set(entry.yearIndex, existing);
  });
  return map;
}

export function runSimulation(scenario: Scenario): SimulationResult {
  const years = scenario.endAge - scenario.startAge;
  const yearRows: YearRow[] = [];
  const ledger: LedgerEntry[] = [];

  const state: SimulationState = {
    ira: scenario.iraBalance,
    roth: scenario.rothBalance,
    taxableMarket: scenario.taxableBalance,
    taxableBasis: scenario.taxableBasisValue,
    cash: scenario.cashBalance,
  };

  let priorYearIra = state.ira;

  for (let yearIndex = 0; yearIndex <= years; yearIndex += 1) {
    const age = scenario.startAge + yearIndex;
    const yearLedger: LedgerEntry[] = [];
    let growth = {
      ira: 0,
      roth: 0,
      taxable: 0,
      cash: 0,
      total: 0,
    };
    let cashInterest = 0;

    // Apply growth at the start of each year (including year 0)
    const iraGrowth = state.ira * scenario.investmentReturn;
    const rothGrowth = state.roth * scenario.investmentReturn;
    const taxableGrowth = state.taxableMarket * scenario.investmentReturn;
    const cashGrowth = state.cash * scenario.cashReturn;

    state.ira += iraGrowth;
    state.roth += rothGrowth;
    state.taxableMarket += taxableGrowth;
    state.cash += cashGrowth;
    cashInterest = Math.max(0, cashGrowth);

    growth = {
      ira: iraGrowth,
      roth: rothGrowth,
      taxable: taxableGrowth,
      cash: cashGrowth,
      total: iraGrowth + rothGrowth + taxableGrowth + cashGrowth,
    };

    if (iraGrowth !== 0) {
      yearLedger.push(
        createLedgerEntry({
          yearIndex,
          age,
          phase: "growth",
          type: "growth",
          amountGross: iraGrowth,
          account: "ira",
          purpose: "reinvest",
          attribution: "capital_gains",
          description: `IRA growth`,
        }),
      );
    }
    if (rothGrowth !== 0) {
      yearLedger.push(
        createLedgerEntry({
          yearIndex,
          age,
          phase: "growth",
          type: "growth",
          amountGross: rothGrowth,
          account: "roth",
          purpose: "reinvest",
          attribution: "capital_gains",
          description: `Roth growth`,
        }),
      );
    }
    if (taxableGrowth !== 0) {
      yearLedger.push(
        createLedgerEntry({
          yearIndex,
          age,
          phase: "growth",
          type: "growth",
          amountGross: taxableGrowth,
          account: "taxable",
          purpose: "reinvest",
          attribution: "capital_gains",
          description: `Taxable account growth`,
        }),
      );
    }
    if (cashGrowth !== 0) {
      yearLedger.push(
        createLedgerEntry({
          yearIndex,
          age,
          phase: "growth",
          type: "growth",
          amountGross: cashGrowth,
          account: "cash",
          purpose: "reinvest",
          attribution: "interest",
          description: `Cash interest`,
        }),
      );
    }

    const spendingNeed = calculateSpendingNeed(scenario, yearIndex, age);

    const ssGross = scenario.ssEnabled
      ? calculateSSBenefit(
          age,
          scenario.ssAnnualBenefit,
          scenario.ssClaimAge,
          yearIndex,
          scenario.inflationRate,
        )
      : 0;
    if (ssGross > 0) {
      state.cash += ssGross;
      yearLedger.push(
        createLedgerEntry({
          yearIndex,
          age,
          phase: "spending",
          type: "income",
          amountGross: ssGross,
          account: "cash",
          purpose: "income",
          attribution: "social_security",
          description: `Social Security benefit`,
        }),
      );
    }

    const rmdRequired = calculateRMD(age, priorYearIra);

    const spendingNetNeed = Math.max(0, spendingNeed.totalBeforeIncome - ssGross);
    const spendingOutcome = withdrawForSpending(
      spendingNetNeed,
      scenario.withdrawalOrder,
      state,
      scenario,
      yearIndex,
      age,
    );
    yearLedger.push(...spendingOutcome.entries);

    let rothConversion = 0;
    if (
      age >= scenario.rothConversionStartAge &&
      age <= scenario.rothConversionEndAge &&
      scenario.rothConversionAmount > 0 &&
      state.ira > 0
    ) {
      rothConversion = Math.min(state.ira, scenario.rothConversionAmount);
      state.ira -= rothConversion;
      state.roth += rothConversion;
      yearLedger.push(
        createLedgerEntry({
          yearIndex,
          age,
          phase: "conversion",
          type: "transfer",
          amountGross: rothConversion,
          accountFrom: "ira",
          accountTo: "roth",
          purpose: "conversion",
          attribution: "roth_conversion",
          description: `Roth conversion`,
        }),
      );
    }

    let iraDistributionsPlanned = spendingOutcome.iraGross;
    let iraDistributionsActual = spendingOutcome.iraGross;
    let realizedCapGains = spendingOutcome.taxableGains;
    let rmdForced = 0;
    let rmdSurplusReinvested = 0;

    if (rmdRequired > iraDistributionsPlanned) {
      rmdForced = Math.min(state.ira, rmdRequired - iraDistributionsPlanned);
      if (rmdForced > 0) {
        state.ira -= rmdForced;
        iraDistributionsActual += rmdForced;
        // Note: We do NOT deduct tax here - the tax will be computed in calculateYearlyTax
        // and paid through the normal tax payment process. The RMD amount goes to cash
        // temporarily, then after taxes are paid, any surplus is reinvested.
        state.cash += rmdForced;

        const rmdTaxOwed = rmdForced * scenario.ordinaryIncomeRate;
        const rmdNetAmount = rmdForced - rmdTaxOwed;

        yearLedger.push(
          createLedgerEntry({
            yearIndex,
            age,
            phase: "rmd",
            type: "withdrawal",
            amountGross: rmdForced,
            amountNet: rmdNetAmount,
            account: "ira",
            taxOrdinary: rmdTaxOwed,
            purpose: "rmd",
            attribution: "ira_distribution",
            description: `RMD forced distribution (gross goes to cash, subject to income tax)`,
          }),
        );
      }
    }

    // Tax iteration: paying taxes may create more taxable income, which creates more tax
    // We iterate until the tax bill stabilizes (bounded to prevent infinite loops)
    const MAX_TAX_ITERATIONS = 5;
    const TAX_TOLERANCE = 1; // $1 tolerance
    
    let totalIraForTax = iraDistributionsActual;
    let totalCapGains = realizedCapGains;
    let taxPayment: TaxPaymentOutcome = {
      paidFrom: emptyTaxPaidFrom(),
      iraGross: 0,
      taxableGross: 0,
      taxableGains: 0,
      taxOrdinary: 0,
      taxCapGains: 0,
      remaining: 0,
      entries: [],
    };
    let finalTaxCalc: ReturnType<typeof calculateYearlyTax> | null = null;
    let finalSsTaxable = 0;
    
    for (let iter = 0; iter < MAX_TAX_ITERATIONS; iter++) {
      // Calculate SS taxability based on current income
      const ssTaxableResult = calculateSSTaxable(
        ssGross,
        totalIraForTax + rothConversion + totalCapGains + cashInterest,
      );
      finalSsTaxable = ssTaxableResult.taxable;

      // Calculate tax
      const taxCalc = calculateYearlyTax(
        totalIraForTax,
        rothConversion,
        totalCapGains,
        cashInterest,
        ssGross,
        finalSsTaxable,
        scenario.ordinaryIncomeRate,
        scenario.capitalGainsRate,
      );
      
      // On first iteration, or if tax changed, pay taxes
      const taxToPay = taxCalc.totalTax - (taxPayment.paidFrom.cash + taxPayment.paidFrom.taxable + taxPayment.paidFrom.ira);
      
      if (taxToPay <= TAX_TOLERANCE) {
        // Tax is fully paid or close enough
        finalTaxCalc = taxCalc;
        break;
      }
      
      // Pay remaining tax
      const newPayment = payTaxes(
        taxToPay,
        scenario.taxPaymentOrder,
        state,
        scenario,
        yearIndex,
        age,
      );
      
      // Accumulate payment info
      taxPayment.paidFrom.cash += newPayment.paidFrom.cash;
      taxPayment.paidFrom.taxable += newPayment.paidFrom.taxable;
      taxPayment.paidFrom.ira += newPayment.paidFrom.ira;
      taxPayment.iraGross += newPayment.iraGross;
      taxPayment.taxableGross += newPayment.taxableGross;
      taxPayment.taxableGains += newPayment.taxableGains;
      taxPayment.taxOrdinary += newPayment.taxOrdinary;
      taxPayment.taxCapGains += newPayment.taxCapGains;
      taxPayment.remaining = newPayment.remaining;
      taxPayment.entries.push(...newPayment.entries);
      
      // Update totals for next iteration
      totalIraForTax = iraDistributionsActual + taxPayment.iraGross;
      totalCapGains = realizedCapGains + taxPayment.taxableGains;
      finalTaxCalc = taxCalc;
      
      // If no new income was generated (paid from cash only), we're done
      if (newPayment.iraGross === 0 && newPayment.taxableGains === 0) {
        break;
      }
    }
    
    // Warn if taxes couldn't be fully paid (rare edge case of depleted accounts)
    if (taxPayment.remaining > TAX_TOLERANCE) {
      console.warn(
        `Year ${yearIndex} (age ${age}): Tax shortfall of $${taxPayment.remaining.toFixed(2)} - insufficient funds to pay all taxes`,
      );
    }
    
    yearLedger.push(...taxPayment.entries);

    iraDistributionsActual += taxPayment.iraGross;
    realizedCapGains += taxPayment.taxableGains;
    const ssTaxable = finalSsTaxable;
    const taxCalc = finalTaxCalc!;
    
    // Handle RMD surplus reinvestment: if we had forced RMD that exceeded spending needs,
    // the net amount (after taxes) should be reinvested to taxable
    if (rmdForced > 0) {
      // The theoretical net RMD is the gross RMD minus its own tax
      const rmdTax = rmdForced * scenario.ordinaryIncomeRate;
      const theoreticalNetRmd = rmdForced - rmdTax;
      
      // The actual surplus is limited by available cash - if taxes (from RMD or other
      // sources) were paid from cash, less of the RMD may be available for reinvestment
      rmdSurplusReinvested = Math.max(0, Math.min(theoreticalNetRmd, state.cash));
      
      // Move from cash to taxable (it was already added to cash above)
      if (rmdSurplusReinvested > 0) {
        state.cash -= rmdSurplusReinvested;
        state.taxableMarket += rmdSurplusReinvested;
        state.taxableBasis += rmdSurplusReinvested;
        
        yearLedger.push(
          createLedgerEntry({
            yearIndex,
            age,
            phase: "reinvest",
            type: "deposit",
            amountGross: rmdSurplusReinvested,
            account: "taxable",
            purpose: "reinvest",
            attribution: "ira_distribution",
            description: `Reinvested RMD surplus`,
          }),
        );
      }
    }

    const yearRow = buildYearRow({
      yearIndex,
      age,
      state,
      taxableBasis: state.taxableBasis,
      spendingNeed,
      ssGross,
      spendingFundedFrom: spendingOutcome.fundedFrom,
      spendingShortfall: spendingOutcome.shortfall,
      tax: taxCalc,
      taxPaidFrom: taxPayment.paidFrom,
      taxShortfall: taxPayment.remaining,
      iraDistributionsPlanned,
      rmdRequired,
      rmdForced,
      iraDistributionsActual,
      rmdSurplusReinvested,
      rothConversion,
      ssTaxable,
      growth,
      scenario,
    });

    yearRows.push(yearRow);
    ledger.push(...yearLedger);
    priorYearIra = state.ira;
  }

  return {
    scenario,
    yearRows,
    ledger,
    summary: computeSummary(yearRows),
    ledgerByYear: groupLedgerByYear(ledger),
  };
}
