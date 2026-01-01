"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { formatPercent } from "@/lib/format";
import { useStore } from "@/lib/store";

export function EconomicAssumptionsForm() {
  const scenario = useStore((s) => s.scenario);
  const updateScenario = useStore((s) => s.updateScenario);

  return (
    <Card size="sm" className="mb-4 break-inside-avoid">
      <CardHeader>
        <CardTitle>Economic Assumptions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label>Investment Return</Label>
            <span className="text-xs font-semibold">
              {formatPercent(scenario.investmentReturn)}
            </span>
          </div>
          <Slider
            value={[scenario.investmentReturn * 100]}
            onValueChange={([value]) =>
              updateScenario({ investmentReturn: value / 100 })
            }
            min={0}
            max={15}
            step={0.1}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label>Cash Return</Label>
            <span className="text-xs font-semibold">
              {formatPercent(scenario.cashReturn)}
            </span>
          </div>
          <Slider
            value={[scenario.cashReturn * 100]}
            onValueChange={([value]) =>
              updateScenario({ cashReturn: value / 100 })
            }
            min={0}
            max={8}
            step={0.1}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label>Inflation Rate</Label>
            <span className="text-xs font-semibold">
              {formatPercent(scenario.inflationRate)}
            </span>
          </div>
          <Slider
            value={[scenario.inflationRate * 100]}
            onValueChange={([value]) =>
              updateScenario({ inflationRate: value / 100 })
            }
            min={0}
            max={10}
            step={0.1}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label>Effective Ordinary Income Tax Rate</Label>
            <span className="text-xs font-semibold">
              {formatPercent(scenario.ordinaryIncomeRate)}
            </span>
          </div>
          <Slider
            value={[scenario.ordinaryIncomeRate * 100]}
            onValueChange={([value]) =>
              updateScenario({ ordinaryIncomeRate: value / 100 })
            }
            min={0}
            max={50}
            step={0.1}
          />
          <span className="text-xs text-muted-foreground">
            Use a blended rate to approximate progressive brackets.
          </span>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label>Capital Gains Tax Rate</Label>
            <span className="text-xs font-semibold">
              {formatPercent(scenario.capitalGainsRate)}
            </span>
          </div>
          <Slider
            value={[scenario.capitalGainsRate * 100]}
            onValueChange={([value]) =>
              updateScenario({ capitalGainsRate: value / 100 })
            }
            min={0}
            max={30}
            step={0.1}
          />
        </div>
      </CardContent>
    </Card>
  );
}
