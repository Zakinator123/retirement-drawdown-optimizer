"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { ColumnHeader, COLUMN_TOOLTIPS } from "@/components/results/year-table/column-definitions";
import { LedgerEntriesView } from "@/components/results/year-table/ledger-entries-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function YearTable() {
  const results = useStore((s) => s.results);
  const scenario = useStore((s) => s.scenario);
  const expanded = useStore((s) => s.expandedYearRows);
  const toggle = useStore((s) => s.toggleYearRowExpanded);

  if (!results) return null;

  // Filter rows to only show those within the scenario's age range
  // This is a defensive check in case of stale state or simulation issues
  const filteredRows = results.yearRows.filter(
    (row) => row.age >= scenario.startAge && row.age <= scenario.endAge
  );

  const ssEnabled = scenario.ssEnabled;

  // Color classes matching POC styles
  const balanceClass = "bg-[rgba(59,130,246,0.08)] dark:bg-[rgba(59,130,246,0.12)]";
  const spendingClass = "bg-[rgba(16,185,129,0.08)] dark:bg-[rgba(16,185,129,0.12)]";
  const taxClass = "bg-[rgba(239,68,68,0.08)] dark:bg-[rgba(239,68,68,0.12)]";
  const iraClass = "bg-[rgba(139,92,246,0.08)] dark:bg-[rgba(139,92,246,0.12)]";
  const ssClass = "bg-[rgba(6,182,212,0.08)] dark:bg-[rgba(6,182,212,0.12)]";
  const valuationClass = "bg-[rgba(16,185,129,0.08)] dark:bg-[rgba(16,185,129,0.12)]";
  const groupHeaderCellClass = "sticky top-0 z-30 bg-card/95 backdrop-blur-sm h-10";
  const columnHeaderCellClass = "sticky top-10 z-20 bg-muted/95 backdrop-blur-sm";

  // Calculate colspan for expanded rows
  const totalColumns = ssEnabled ? 13 : 11;

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="max-h-[70vh] overflow-auto">
        <Table className="relative" wrapperClassName="overflow-visible">
          <TableHeader>
            {/* Group header row */}
            <TableRow className="border-b-0">
              <TableHead className={groupHeaderCellClass} />
              <TableHead className={groupHeaderCellClass} />
              <TableHead 
                colSpan={4} 
                className={cn(
                  groupHeaderCellClass,
                  "text-center font-bold text-xs uppercase tracking-wider border-l-2 border-l-blue-500/50",
                  "text-blue-600 dark:text-blue-400",
                  "shadow-[inset_0_-3px_0_currentColor]"
                )}
              >
                Balances
              </TableHead>
              <TableHead 
                colSpan={1} 
                className={cn(
                  groupHeaderCellClass,
                  "text-center font-bold text-xs uppercase tracking-wider border-l-2 border-l-green-500/50",
                  "text-green-600 dark:text-green-400",
                  "shadow-[inset_0_-3px_0_currentColor]"
                )}
              >
                Spending
              </TableHead>
              <TableHead 
                colSpan={1} 
                className={cn(
                  groupHeaderCellClass,
                  "text-center font-bold text-xs uppercase tracking-wider border-l-2 border-l-red-500/50",
                  "text-red-600 dark:text-red-400",
                  "shadow-[inset_0_-3px_0_currentColor]"
                )}
              >
                Taxes
              </TableHead>
              <TableHead 
                colSpan={2} 
                className={cn(
                  groupHeaderCellClass,
                  "text-center font-bold text-xs uppercase tracking-wider border-l-2 border-l-purple-500/50",
                  "text-purple-600 dark:text-purple-400",
                  "shadow-[inset_0_-3px_0_currentColor]"
                )}
              >
                IRA Activity
              </TableHead>
              {ssEnabled && (
                <TableHead 
                  colSpan={2} 
                  className={cn(
                    groupHeaderCellClass,
                    "text-center font-bold text-xs uppercase tracking-wider border-l-2 border-l-cyan-500/50",
                    "text-cyan-600 dark:text-cyan-400",
                    "shadow-[inset_0_-3px_0_currentColor]"
                  )}
                >
                  Social Security
                </TableHead>
              )}
              <TableHead 
                colSpan={1} 
                className={cn(
                  groupHeaderCellClass,
                  "text-center font-bold text-xs uppercase tracking-wider border-l-2 border-l-teal-500/50",
                  "text-teal-600 dark:text-teal-400",
                  "shadow-[inset_0_-3px_0_currentColor]"
                )}
              >
                Valuation
              </TableHead>
            </TableRow>
            {/* Column header row */}
            <TableRow>
              <TableHead className={cn("w-8", columnHeaderCellClass)} />
              <TableHead className={columnHeaderCellClass}>Age</TableHead>
              <TableHead className={cn("border-l-4 border-l-blue-500/30", balanceClass, columnHeaderCellClass)}>
                <ColumnHeader label="IRA" tooltip={COLUMN_TOOLTIPS.iraEnd} />
              </TableHead>
              <TableHead className={cn(balanceClass, columnHeaderCellClass)}>
                <ColumnHeader label="Roth" tooltip={COLUMN_TOOLTIPS.rothEnd} />
              </TableHead>
              <TableHead className={cn(balanceClass, columnHeaderCellClass)}>
                <ColumnHeader label="Taxable" tooltip={COLUMN_TOOLTIPS.taxableEnd} />
              </TableHead>
              <TableHead className={cn(balanceClass, columnHeaderCellClass)}>
                <ColumnHeader label="Cash" tooltip={COLUMN_TOOLTIPS.cashEnd} />
              </TableHead>
              <TableHead className={cn("border-l-4 border-l-green-500/30", spendingClass, columnHeaderCellClass)}>
                <ColumnHeader label="Need" tooltip={COLUMN_TOOLTIPS.spendingNeed} />
              </TableHead>
              <TableHead className={cn("border-l-4 border-l-red-500/30", taxClass, columnHeaderCellClass)}>Total</TableHead>
              <TableHead className={cn("border-l-4 border-l-purple-500/30", iraClass, columnHeaderCellClass)}>
                <ColumnHeader label="RMD" tooltip={COLUMN_TOOLTIPS.rmdRequired} />
              </TableHead>
              <TableHead className={cn(iraClass, columnHeaderCellClass)}>Conv.</TableHead>
              {ssEnabled && (
                <>
                  <TableHead className={cn("border-l-4 border-l-cyan-500/30", ssClass, columnHeaderCellClass)}>Gross</TableHead>
                  <TableHead className={cn(ssClass, columnHeaderCellClass)}>
                    <ColumnHeader label="Taxable" tooltip={COLUMN_TOOLTIPS.ssTaxable} />
                  </TableHead>
                </>
              )}
              <TableHead className={cn("border-l-4 border-l-teal-500/30", valuationClass, columnHeaderCellClass)}>
                <ColumnHeader label="TANW" tooltip={COLUMN_TOOLTIPS.tanw} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => {
              const isExpanded = expanded.has(row.yearIndex);
              const ledgerEntries =
                results.ledgerByYear.get(row.yearIndex) ?? [];
              return (
                <React.Fragment key={row.yearIndex}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggle(row.yearIndex)}
                  >
                    <TableCell className="w-8">
                      {isExpanded ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </TableCell>
                    <TableCell>{row.age}</TableCell>
                    <TableCell className={cn("border-l-4 border-l-blue-500/30", balanceClass)}>
                      {formatCurrencyCompact(row.iraEnd)}
                    </TableCell>
                    <TableCell className={balanceClass}>
                      {formatCurrencyCompact(row.rothEnd)}
                    </TableCell>
                    <TableCell className={balanceClass}>
                      {formatCurrencyCompact(row.taxableEnd)}
                    </TableCell>
                    <TableCell className={balanceClass}>
                      {formatCurrencyCompact(row.cashEnd)}
                    </TableCell>
                    <TableCell className={cn("border-l-4 border-l-green-500/30", spendingClass)}>
                      {formatCurrencyCompact(row.spendingNeed)}
                    </TableCell>
                    <TableCell className={cn("border-l-4 border-l-red-500/30", taxClass)}>
                      {formatCurrencyCompact(row.taxOwedTotal)}
                    </TableCell>
                    <TableCell className={cn("border-l-4 border-l-purple-500/30", iraClass)}>
                      {formatCurrencyCompact(row.rmdRequired)}
                    </TableCell>
                    <TableCell className={iraClass}>
                      {formatCurrencyCompact(row.rothConversion)}
                    </TableCell>
                    {ssEnabled && (
                      <>
                        <TableCell className={cn("border-l-4 border-l-cyan-500/30", ssClass)}>
                          {formatCurrencyCompact(row.ssGross)}
                        </TableCell>
                        <TableCell className={ssClass}>
                          {formatCurrencyCompact(row.ssTaxable)}
                        </TableCell>
                      </>
                    )}
                    <TableCell className={cn("border-l-4 border-l-teal-500/30", valuationClass)}>
                      {formatCurrencyCompact(row.tanw)}
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow
                      className={cn("bg-muted/40")}
                    >
                      <TableCell colSpan={totalColumns} className="p-0">
                        <LedgerEntriesView entries={ledgerEntries} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
