"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { LedgerEntry } from "@/lib/engine";

function groupByPhase(entries: LedgerEntry[]) {
  return entries.reduce<Record<string, LedgerEntry[]>>((acc, entry) => {
    if (!acc[entry.phase]) acc[entry.phase] = [];
    acc[entry.phase].push(entry);
    return acc;
  }, {});
}

export function LedgerEntriesView({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No ledger entries for this year.
      </div>
    );
  }

  const grouped = groupByPhase(entries);

  const sections = Object.entries(grouped);

  return (
    <div className="flex justify-center p-10">
      <Table
        wrapperClassName="w-auto"
        className="w-auto whitespace-nowrap rounded-lg border border-border bg-background/60"
      >
        <TableHeader>
          <TableRow>
            <TableHead className="py-3">Type</TableHead>
            <TableHead className="py-3">Description</TableHead>
            <TableHead className="py-3">Account</TableHead>
            <TableHead className="py-3">Gross</TableHead>
            <TableHead className="py-3">Net</TableHead>
            <TableHead className="py-3">Income Tax</TableHead>
            <TableHead className="py-3">Cap Gains Tax</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map(([phase, phaseEntries], index) => (
            <React.Fragment key={phase}>
              <TableRow className="bg-muted/40">
                <TableCell colSpan={7} className="py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {phase.replace("_", " ")}
                    </Badge>
                    <span>{phaseEntries.length} entries</span>
                  </div>
                </TableCell>
              </TableRow>
              {phaseEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground">
                    {entry.description}
                  </TableCell>
                  <TableCell className="py-3">
                    {entry.account ?? entry.accountFrom ?? "-"}
                  </TableCell>
                  <TableCell className="py-3">
                    {formatCurrencyCompact(entry.amountGross)}
                  </TableCell>
                  <TableCell className="py-3">
                    {entry.amountNet !== undefined
                      ? formatCurrencyCompact(entry.amountNet)
                      : "-"}
                  </TableCell>
                  <TableCell className="py-3 text-amber-600 dark:text-amber-400">
                    {entry.taxOrdinary
                      ? formatCurrencyCompact(entry.taxOrdinary)
                      : "-"}
                  </TableCell>
                  <TableCell className="py-3 text-orange-600 dark:text-orange-400">
                    {entry.taxCapGains
                      ? formatCurrencyCompact(entry.taxCapGains)
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {index < sections.length - 1 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <div className="h-px w-full bg-border" />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
