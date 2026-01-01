"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";

export function SimulationRangeForm() {
  const scenario = useStore((s) => s.scenario);
  const updateScenario = useStore((s) => s.updateScenario);

  const clampRange = (startAge: number, endAge: number) => {
    const nextStart = Math.min(startAge, endAge);
    const nextEnd = Math.max(startAge, endAge);

    const spendingPhases = scenario.spendingPhases.map((phase) => ({
      ...phase,
      fromAge: Math.max(nextStart, Math.min(phase.fromAge, nextEnd)),
      toAge: Math.max(nextStart, Math.min(phase.toAge, nextEnd)),
    }));

    const oneOffExpenses = scenario.oneOffExpenses.map((expense) => ({
      ...expense,
      age: Math.max(nextStart, Math.min(expense.age, nextEnd)),
    }));

    const rothConversionStartAge = Math.max(
      nextStart,
      Math.min(scenario.rothConversionStartAge, nextEnd),
    );
    const rothConversionEndAge = Math.max(
      rothConversionStartAge,
      Math.min(scenario.rothConversionEndAge, nextEnd),
    );

    updateScenario({
      startAge: nextStart,
      endAge: nextEnd,
      spendingPhases,
      oneOffExpenses,
      rothConversionStartAge,
      rothConversionEndAge,
    });
  };

  return (
    <Card size="sm" className="mb-4 break-inside-avoid">
      <CardHeader>
        <CardTitle>Simulation Age Range</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label>Age Range</Label>
            <span className="text-xs font-semibold">
              {scenario.startAge}–{scenario.endAge}
            </span>
          </div>
          <Slider
            value={[scenario.startAge, scenario.endAge]}
            onValueChange={([startAge, endAge]) => clampRange(startAge, endAge)}
            min={60}
            max={100}
            step={1}
          />
        </div>
      </CardContent>
    </Card>
  );
}
