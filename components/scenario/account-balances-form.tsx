"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";

function BalanceField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <Label>{label}</Label>
        <span className="text-sm font-medium">{formatCurrency(value)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={max}
        step={10_000}
      />
    </div>
  );
}

export function AccountBalancesForm() {
  const scenario = useStore((s) => s.scenario);
  const updateScenario = useStore((s) => s.updateScenario);

  return (
    <Card size="sm" className="mb-4 break-inside-avoid">
      <CardHeader>
        <CardTitle>Account Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <BalanceField
          label="Traditional IRA"
          value={scenario.iraBalance}
          onChange={(value) => updateScenario({ iraBalance: value })}
          max={5_000_000}
        />
        <BalanceField
          label="Roth IRA"
          value={scenario.rothBalance}
          onChange={(value) => updateScenario({ rothBalance: value })}
          max={5_000_000}
        />
        <BalanceField
          label="Taxable Brokerage"
          value={scenario.taxableBalance}
          onChange={(value) => updateScenario({ taxableBalance: value })}
          max={5_000_000}
        />
        <BalanceField
          label="Taxable Cost Basis"
          value={scenario.taxableBasisValue}
          onChange={(value) => updateScenario({ taxableBasisValue: value })}
          max={scenario.taxableBalance}
        />
        <BalanceField
          label="Cash / Money Market"
          value={scenario.cashBalance}
          onChange={(value) => updateScenario({ cashBalance: value })}
          max={1_000_000}
        />
      </CardContent>
    </Card>
  );
}
