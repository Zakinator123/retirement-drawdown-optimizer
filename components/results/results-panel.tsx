"use client";

import { useEffect } from "react";

import { SummaryCards } from "@/components/results/summary-cards";
import { BalancesChart } from "@/components/results/charts/balances-chart";
import { WithdrawalsChart } from "@/components/results/charts/withdrawals-chart";
import { TaxesChart } from "@/components/results/charts/taxes-chart";
import { TanwChart } from "@/components/results/charts/tanw-chart";
import { useStore } from "@/lib/store";

export function ResultsPanel() {
  const runSimulation = useStore((s) => s.runSimulation);
  const results = useStore((s) => s.results);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  if (!results) {
    return <div className="text-sm text-muted-foreground">Running simulation...</div>;
  }

  return (
    <section className="space-y-6">
      <SummaryCards />
      <div className="grid gap-6 xl:grid-cols-2">
        <BalancesChart />
        <TanwChart />
        <WithdrawalsChart />
        <TaxesChart />
      </div>
    </section>
  );
}
