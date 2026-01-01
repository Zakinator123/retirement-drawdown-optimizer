"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";

export function SocialSecurityForm() {
  const scenario = useStore((s) => s.scenario);
  const updateScenario = useStore((s) => s.updateScenario);

  return (
    <Card size="sm" className="mb-4 break-inside-avoid">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Social Security
          <label className="flex items-center gap-2 text-sm font-normal">
            <input
              type="checkbox"
              checked={scenario.ssEnabled}
              onChange={(event) =>
                updateScenario({ ssEnabled: event.target.checked })
              }
            />
            Enabled
          </label>
        </CardTitle>
      </CardHeader>
      {scenario.ssEnabled && (
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <Label>Annual Benefit at FRA</Label>
              <span className="text-xs font-semibold">
                {formatCurrency(scenario.ssAnnualBenefit)}
              </span>
            </div>
            <Slider
              value={[scenario.ssAnnualBenefit]}
              onValueChange={([value]) =>
                updateScenario({ ssAnnualBenefit: value })
              }
              min={0}
              max={120_000}
              step={1_000}
            />
            <span className="text-xs text-muted-foreground">
              FRA = Full Retirement Age.
            </span>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <Label>Claim Age</Label>
              <span className="text-xs font-semibold">{scenario.ssClaimAge}</span>
            </div>
            <Slider
              value={[scenario.ssClaimAge]}
              onValueChange={([value]) =>
                updateScenario({ ssClaimAge: value })
              }
              min={62}
              max={70}
              step={1}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
