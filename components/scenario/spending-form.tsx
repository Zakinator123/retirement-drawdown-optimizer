"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";

function getPhaseIssues(
  phases: { fromAge: number; toAge: number }[],
  startAge: number,
  endAge: number,
) {
  const sorted = [...phases].sort((a, b) => a.fromAge - b.fromAge);
  const issues: string[] = [];

  sorted.forEach((phase, index) => {
    if (phase.fromAge > phase.toAge) {
      issues.push(`Phase ${index + 1} has a start age after its end age.`);
    }
    if (index > 0) {
      const prev = sorted[index - 1];
      if (phase.fromAge <= prev.toAge) {
        issues.push(`Phase ${index + 1} overlaps with phase ${index}.`);
      }
    }
  });

  // Check if phases cover the entire simulation age range
  if (sorted.length > 0) {
    // Check if first phase starts at or before simulation start
    if (sorted[0].fromAge > startAge) {
      issues.push(
        `Coverage gap: No spending phase covers ages ${startAge}–${sorted[0].fromAge - 1}.`,
      );
    }

    // Check for gaps between phases
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      if (current.fromAge > prev.toAge + 1) {
        issues.push(
          `Coverage gap: No spending phase covers ages ${prev.toAge + 1}–${current.fromAge - 1}.`,
        );
      }
    }

    // Check if last phase ends at or after simulation end
    const lastPhase = sorted[sorted.length - 1];
    if (lastPhase.toAge < endAge) {
      issues.push(
        `Coverage gap: No spending phase covers ages ${lastPhase.toAge + 1}–${endAge}.`,
      );
    }
  } else {
    issues.push("At least one spending phase is required.");
  }

  return issues;
}

export function SpendingForm() {
  const scenario = useStore((s) => s.scenario);
  const updateScenario = useStore((s) => s.updateScenario);
  const issues = getPhaseIssues(
    scenario.spendingPhases,
    scenario.startAge,
    scenario.endAge,
  );

  const updatePhase = (index: number, partial: Partial<(typeof scenario.spendingPhases)[0]>) => {
    const next = scenario.spendingPhases.map((phase, i) =>
      i === index ? { ...phase, ...partial } : phase,
    );
    updateScenario({ spendingPhases: next });
  };

  const addPhase = () => {
    updateScenario({
      spendingPhases: [
        ...scenario.spendingPhases,
        { fromAge: scenario.endAge, toAge: scenario.endAge, annualAmount: 0, label: "" },
      ],
    });
  };

  const removePhase = (index: number) => {
    updateScenario({
      spendingPhases: scenario.spendingPhases.filter((_, i) => i !== index),
    });
  };

  const updateExpense = (
    index: number,
    partial: Partial<(typeof scenario.oneOffExpenses)[0]>,
  ) => {
    const next = scenario.oneOffExpenses.map((expense, i) =>
      i === index ? { ...expense, ...partial } : expense,
    );
    updateScenario({ oneOffExpenses: next });
  };

  const addExpense = () => {
    updateScenario({
      oneOffExpenses: [
        ...scenario.oneOffExpenses,
        { age: scenario.startAge, amount: 0, note: "" },
      ],
    });
  };

  const removeExpense = (index: number) => {
    updateScenario({
      oneOffExpenses: scenario.oneOffExpenses.filter((_, i) => i !== index),
    });
  };

  return (
    <Card size="sm" className="mb-4 break-inside-avoid">
      <CardHeader>
        <CardTitle>Spending Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={14} />
              Spending Plan Issues
            </div>
            <ul className="mt-1 list-disc pl-5">
              {issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">
            Spending Phases
          </div>
          {scenario.spendingPhases.map((phase, index) => (
            <div key={index} className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Age Range
                  </span>
                  <span className="text-xs font-semibold">
                    {phase.fromAge}–{phase.toAge}
                  </span>
                </div>
                <Slider
                  value={[phase.fromAge, phase.toAge]}
                  onValueChange={([fromAge, toAge]) => {
                    const nextStart = Math.max(
                      scenario.startAge,
                      Math.min(fromAge, toAge),
                    );
                    const nextEnd = Math.min(
                      scenario.endAge,
                      Math.max(fromAge, toAge),
                    );
                    updatePhase(index, { fromAge: nextStart, toAge: nextEnd });
                  }}
                  min={scenario.startAge}
                  max={scenario.endAge}
                  step={1}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Annual Amount
                  </span>
                  <span className="text-xs font-semibold">
                    {formatCurrency(phase.annualAmount)}
                  </span>
                </div>
                <Slider
                  value={[phase.annualAmount]}
                  onValueChange={([value]) =>
                    updatePhase(index, { annualAmount: value })
                  }
                  min={0}
                  max={300_000}
                  step={1_000}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => removePhase(index)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <Button variant="outline" type="button" onClick={addPhase}>
            Add Phase
          </Button>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">
            One-Off Expenses
          </div>
          {scenario.oneOffExpenses.map((expense, index) => (
            <div key={index} className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Expense Age
                  </span>
                  <span className="text-xs font-semibold">{expense.age}</span>
                </div>
                <Slider
                  value={[expense.age]}
                  onValueChange={([value]) => updateExpense(index, { age: value })}
                  min={scenario.startAge}
                  max={scenario.endAge}
                  step={1}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Amount
                  </span>
                  <span className="text-xs font-semibold">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
                <Slider
                  value={[expense.amount]}
                  onValueChange={([value]) => updateExpense(index, { amount: value })}
                  min={0}
                  max={250_000}
                  step={1_000}
                />
              </div>
              <Input
                value={expense.note}
                onChange={(event) =>
                  updateExpense(index, { note: event.target.value })
                }
                placeholder="Note"
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => removeExpense(index)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <Button variant="outline" type="button" onClick={addExpense}>
            Add One-Off
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
