export type AccountType = "ira" | "roth" | "taxable" | "cash";

export interface SpendingPhase {
  fromAge: number;
  toAge: number;
  annualAmount: number;
  label?: string;
}

export interface OneOffExpense {
  age: number;
  amount: number;
  note: string;
}

export interface Scenario {
  startAge: number;
  endAge: number;

  iraBalance: number;
  rothBalance: number;
  taxableBalance: number;
  taxableBasisValue: number;
  cashBalance: number;

  investmentReturn: number;
  cashReturn: number;
  inflationRate: number;

  ordinaryIncomeRate: number;
  capitalGainsRate: number;

  spendingPhases: SpendingPhase[];
  oneOffExpenses: OneOffExpense[];

  ssAnnualBenefit: number;
  ssClaimAge: number;
  ssEnabled: boolean;

  withdrawalOrder: AccountType[];
  taxPaymentOrder: AccountType[];

  rothConversionAmount: number;
  rothConversionStartAge: number;
  rothConversionEndAge: number;

  assumedIraTaxRate: number;
}

export type LedgerEntryType =
  | "income"
  | "withdrawal"
  | "deposit"
  | "transfer"
  | "tax_accrual"
  | "tax_payment"
  | "growth";

export type LedgerEntryPhase =
  | "spending"
  | "rmd"
  | "conversion"
  | "tax_settlement"
  | "reinvest"
  | "growth";

export type LedgerPurpose =
  | "spending"
  | "tax"
  | "conversion"
  | "rmd"
  | "reinvest"
  | "income";

export type LedgerAttribution =
  | "ira_distribution"
  | "roth_withdrawal"
  | "taxable_sale"
  | "cash_withdrawal"
  | "social_security"
  | "roth_conversion"
  | "capital_gains"
  | "interest";

export interface LedgerEntry {
  id: string;
  yearIndex: number;
  age: number;
  phase: LedgerEntryPhase;
  type: LedgerEntryType;
  amountGross: number;
  amountNet?: number;
  account?: AccountType;
  accountFrom?: AccountType;
  accountTo?: AccountType;
  taxOrdinary?: number;
  taxCapGains?: number;
  purpose: LedgerPurpose;
  attribution?: LedgerAttribution;
  description: string;
}

export interface YearRow {
  yearIndex: number;
  age: number;

  iraEnd: number;
  rothEnd: number;
  taxableEnd: number;
  cashEnd: number;
  totalEnd: number;

  spendingNeed: number;
  spendingComponents: {
    baseSpending: number;
    oneOffExpenses: number;
    totalBeforeIncome: number;
    ssIncome: number;
    netSpendingNeed: number;
  };
  spendingFundedFrom: {
    cash: number;
    taxable: number;
    ira: number;
    roth: number;
  };
  spendingShortfall: number;

  taxOwedOrdinary: number;
  taxOwedCapGains: number;
  taxOwedTotal: number;
  taxSources: {
    iraDistributions: number;
    rothConversion: number;
    ssTaxable: number;
    capitalGains: number;
    cashInterest: number;
  };

  taxPaidFrom: {
    cash: number;
    taxable: number;
    ira: number;
  };
  taxShortfall: number;

  iraDistributionsPlanned: number;
  rmdRequired: number;
  rmdForced: number;
  iraDistributionsActual: number;
  rmdSurplusReinvested: number;
  rothConversion: number;

  ssGross: number;
  ssTaxable: number;
  ssEffectiveRate: number;

  growth: {
    ira: number;
    roth: number;
    taxable: number;
    cash: number;
    total: number;
  };

  tanw: number;
  tanwComponents: {
    iraAfterTax: number;
    rothAfterTax: number;
    taxableAfterTax: number;
    cashAfterTax: number;
  };
}

export interface SimulationResult {
  scenario: Scenario;
  yearRows: YearRow[];
  ledger: LedgerEntry[];
  summary: {
    finalTotal: number;
    finalTanw: number;
    totalTaxesPaid: number;
    totalOrdinaryTax: number;
    totalCapGainsTax: number;
    totalConverted: number;
    totalRmds: number;
    totalSpendingShortfall: number;
    worstShortfallYear: number | null;
  };
  ledgerByYear: Map<number, LedgerEntry[]>;
}

export interface OptimizationResult {
  type: "conversion" | "withdrawal" | "ss";
  bestScenario: Scenario;
  bestScore: number;
  variants: Array<{
    label: string;
    scenario: Scenario;
    score: number;
  }>;
}

export interface SimulationState {
  ira: number;
  roth: number;
  taxableMarket: number;
  taxableBasis: number;
  cash: number;
}
