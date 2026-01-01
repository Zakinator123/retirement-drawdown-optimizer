import { YearRow } from "./types";

interface TaxCalculation {
  ordinaryIncome: number;
  capitalGains: number;
  totalTax: number;
  sources: YearRow["taxSources"];
}

export function calculateYearlyTax(
  iraDistributions: number,
  rothConversion: number,
  realizedCapGains: number,
  cashInterest: number,
  ssGross: number,
  ssTaxable: number,
  ordinaryRate: number,
  capGainsRate: number,
): TaxCalculation {
  const ordinaryBase =
    iraDistributions + rothConversion + ssTaxable + cashInterest;
  const ordinaryTax = ordinaryBase * ordinaryRate;
  const capGainsTax = realizedCapGains * capGainsRate;

  return {
    ordinaryIncome: ordinaryTax,
    capitalGains: capGainsTax,
    totalTax: ordinaryTax + capGainsTax,
    sources: {
      iraDistributions: iraDistributions * ordinaryRate,
      rothConversion: rothConversion * ordinaryRate,
      ssTaxable: ssTaxable * ordinaryRate,
      capitalGains: capGainsTax,
      cashInterest: cashInterest * ordinaryRate,
    },
  };
}
