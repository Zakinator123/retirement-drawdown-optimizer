"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function SummaryCard({
  label,
  value,
  className,
  large,
}: {
  label: string;
  value: string;
  className?: string;
  large?: boolean;
}) {
  return (
    <Card className={cn("p-4", large && "p-5", className)}>
      <div className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-lg font-semibold", large && "text-2xl")}>
        {value}
      </div>
    </Card>
  );
}

export function SummaryCards() {
  const results = useStore((s) => s.results);
  if (!results) return null;

  const final = results.yearRows[results.yearRows.length - 1];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label={`IRA at ${final.age}`}
        value={formatCurrency(final.iraEnd)}
        className="border-l-4 border-l-blue-500"
      />
      <SummaryCard
        label={`Roth at ${final.age}`}
        value={formatCurrency(final.rothEnd)}
        className="border-l-4 border-l-emerald-500"
      />
      <SummaryCard
        label={`Taxable at ${final.age}`}
        value={formatCurrency(final.taxableEnd)}
        className="border-l-4 border-l-violet-500"
      />
      <SummaryCard
        label={`Cash at ${final.age}`}
        value={formatCurrency(final.cashEnd)}
        className="border-l-4 border-l-amber-500"
      />
      <SummaryCard
        label={`Total Portfolio at ${final.age}`}
        value={formatCurrency(final.totalEnd)}
        className="md:col-span-2 bg-primary/5"
        large
      />
      <SummaryCard
        label={`Tax-Adjusted Net Worth at ${final.age}`}
        value={formatCurrency(final.tanw)}
        className="md:col-span-2 bg-primary/5"
        large
      />
    </div>
  );
}
