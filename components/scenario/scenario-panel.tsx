"use client";

import { AccountBalancesForm } from "@/components/scenario/account-balances-form";
import { EconomicAssumptionsForm } from "@/components/scenario/economic-assumptions-form";
import { SocialSecurityForm } from "@/components/scenario/social-security-form";
import { SpendingForm } from "@/components/scenario/spending-form";
import { StrategyForm } from "@/components/scenario/strategy-form";
import { SimulationRangeForm } from "@/components/scenario/simulation-range-form";
import { cn } from "@/lib/utils";

export function ScenarioPanel({ className }: { className?: string }) {
  return (
    <section className={cn(className)}>
      <AccountBalancesForm />
      <SimulationRangeForm />
      <EconomicAssumptionsForm />
      <SpendingForm />
      <SocialSecurityForm />
      <StrategyForm />
    </section>
  );
}
