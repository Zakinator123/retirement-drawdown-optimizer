'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { LedgerEntry } from '@/lib/engine/types';
import { formatCurrencyFull } from '@/lib/format';
import { cn } from '@/lib/utils';

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

export function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) return null;
  
  // Group entries by phase for readability
  const grouped = groupBy(entries, 'phase');
  
  return (
    <div className="p-2 bg-muted/20">
      {Object.entries(grouped).map(([phase, phaseEntries]) => (
        <div key={phase} className="mb-4 last:mb-0">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 capitalize px-2">
            {phase.replace('_', ' ')}
          </h4>
          <div className="border rounded-md overflow-hidden">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-32">Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-32">Amount</TableHead>
                  <TableHead className="text-right w-24">Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phaseEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {entry.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[10px]">
                      {entry.account || entry.accountFrom 
                        ? `${entry.accountFrom || ''}${entry.accountFrom && entry.accountTo ? ' → ' : ''}${entry.accountTo || entry.account || ''}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs">{entry.description}</TableCell>
                    <TableCell className={cn(
                      "text-right font-mono text-xs",
                      entry.amountGross >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {formatCurrencyFull(entry.amountGross)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {entry.taxOrdinary || entry.taxCapGains 
                        ? formatCurrencyFull((entry.taxOrdinary || 0) + (entry.taxCapGains || 0))
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

