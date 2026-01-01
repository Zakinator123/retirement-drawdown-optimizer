"use client";

import { Tooltip } from "@/components/ui/tooltip";

export const COLUMN_TOOLTIPS: Record<string, string> = {
  iraEnd: "Traditional IRA balance at end of year",
  rothEnd: "Roth IRA balance at end of year (tax-free)",
  taxableEnd: "Taxable brokerage account balance at end of year",
  cashEnd: "Cash/money market balance at end of year",
  spendingNeed: "Total spending required this year (inflation adjusted)",
  rmdRequired: "IRS Required Minimum Distribution based on prior year IRA balance",
  rmdForced: "RMD beyond planned distributions",
  tanw: "Tax-Adjusted Net Worth accounting for embedded taxes",
  ssTaxable: "Portion of Social Security subject to income tax",
};

export function ColumnHeader({
  label,
  tooltip,
}: {
  label: string;
  tooltip?: string;
}) {
  if (!tooltip) return <span>{label}</span>;
  return (
    <Tooltip content={tooltip}>
      <span className="cursor-help">{label}</span>
    </Tooltip>
  );
}
