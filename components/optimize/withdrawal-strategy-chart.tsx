"use client";

import { useState, useCallback } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@/lib/store";
import {
  compareWithdrawalStrategies,
  WithdrawalComparisonResult,
  Scenario,
} from "@/lib/engine";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/format";

function FixedParametersSummary({ scenario }: { scenario: Scenario }) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-xs">
      <div className="mb-2 font-semibold text-muted-foreground">Fixed Parameters (held constant)</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground sm:grid-cols-3">
        <div>
          <span className="opacity-70">Age range:</span> {scenario.startAge}–{scenario.endAge}
        </div>
        <div>
          <span className="opacity-70">IRA:</span> {formatCurrencyCompact(scenario.iraBalance)}
        </div>
        <div>
          <span className="opacity-70">Roth:</span> {formatCurrencyCompact(scenario.rothBalance)}
        </div>
        <div>
          <span className="opacity-70">Taxable:</span> {formatCurrencyCompact(scenario.taxableBalance)}
        </div>
        <div>
          <span className="opacity-70">Cash:</span> {formatCurrencyCompact(scenario.cashBalance)}
        </div>
        <div>
          <span className="opacity-70">Return:</span> {formatPercent(scenario.investmentReturn)}
        </div>
        <div>
          <span className="opacity-70">Roth conv:</span> {formatCurrencyCompact(scenario.rothConversionAmount)}/yr
        </div>
        <div>
          <span className="opacity-70">Conv ages:</span> {scenario.rothConversionStartAge}–{scenario.rothConversionEndAge}
        </div>
        {scenario.ssEnabled && (
          <div>
            <span className="opacity-70">SS:</span> {formatCurrencyCompact(scenario.ssAnnualBenefit)} @ {scenario.ssClaimAge}
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonChart({ 
  result, 
  computedScenario 
}: { 
  result: WithdrawalComparisonResult; 
  computedScenario: Scenario;
}) {
  const updateScenario = useStore((s) => s.updateScenario);
  
  const handleApplyBest = useCallback(() => {
    updateScenario({ withdrawalOrder: result.best.order });
  }, [result.best, updateScenario]);

  const data = result.strategies.map((s, idx) => ({
    name: s.label,
    tanw: s.tanw,
    totalTaxes: s.totalTaxes,
    isBest: s.label === result.best.label,
    isCurrent: s.label === result.current?.label,
    rank: idx + 1,
  }));

  const tanwRange = result.best.tanw - result.worst.tanw;
  const currentVsBest = result.current 
    ? result.best.tanw - result.current.tanw 
    : 0;

  return (
    <div className="space-y-4">
      {/* What's being optimized */}
      <div className="rounded-lg bg-primary/10 p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Optimizing For</div>
        <div className="text-sm">
          <strong>Final Tax-Adjusted Net Worth (TANW)</strong> at age {computedScenario.endAge}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Compares all {result.strategies.length} withdrawal order permutations
        </div>
      </div>

      {/* Fixed parameters */}
      <FixedParametersSummary scenario={computedScenario} />

      {/* Results summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Best Strategy</div>
          <div className="text-sm font-medium">{result.best.label}</div>
          <div className="text-2xl font-bold tracking-tight text-primary">
            {formatCurrency(result.best.tanw)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">TANW</span>
          </div>
          {currentVsBest > 0 && (
            <div className="text-xs text-green-600">
              +{formatCurrency(currentVsBest)} vs your current strategy
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 text-right">
          <Button size="sm" onClick={handleApplyBest}>
            Apply Best Strategy
          </Button>
          <div className="text-[10px] text-muted-foreground">
            Range: {formatCurrencyCompact(tanwRange)} between best/worst
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              tickFormatter={formatCurrencyCompact}
              domain={['auto', 'auto']}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={180}
              tick={{ fontSize: 10 }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === "tanw") return [formatCurrency(value), "TANW"];
                if (name === "totalTaxes") return [formatCurrency(value), "Total Taxes"];
                return [value, name];
              }}
              labelFormatter={(label) => label}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="tanw" name="tanw">
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={
                    entry.isBest 
                      ? "oklch(0.77 0.20 131)" 
                      : entry.isCurrent 
                        ? "oklch(0.65 0.18 250)" 
                        : "oklch(0.70 0.10 250)"
                  }
                  stroke={entry.isCurrent ? "oklch(0.45 0.20 250)" : "none"}
                  strokeWidth={entry.isCurrent ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: "oklch(0.77 0.20 131)" }} />
          <span>Best</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded ring-2" style={{ backgroundColor: "oklch(0.65 0.18 250)", outlineColor: "oklch(0.45 0.20 250)" }} />
          <span>Your Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: "oklch(0.70 0.10 250)" }} />
          <span>Other</span>
        </div>
      </div>

      {/* Rankings table */}
      <div className="rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-1.5 text-left font-medium">#</th>
              <th className="px-2 py-1.5 text-left font-medium">Strategy</th>
              <th className="px-2 py-1.5 text-right font-medium">TANW</th>
              <th className="px-2 py-1.5 text-right font-medium">Total Taxes</th>
              <th className="px-2 py-1.5 text-right font-medium">vs Best</th>
            </tr>
          </thead>
          <tbody>
            {result.strategies.map((s, idx) => (
              <tr 
                key={s.label} 
                className={`border-b last:border-0 ${
                  s.label === result.current?.label 
                    ? "bg-blue-50 dark:bg-blue-950/30" 
                    : s.label === result.best.label 
                      ? "bg-green-50 dark:bg-green-950/30" 
                      : ""
                }`}
              >
                <td className="px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                <td className="px-2 py-1.5">
                  {s.label}
                  {s.label === result.current?.label && (
                    <span className="ml-1 text-[9px] text-blue-600">(current)</span>
                  )}
                  {s.label === result.best.label && (
                    <span className="ml-1 text-[9px] text-green-600">(best)</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">{formatCurrencyCompact(s.tanw)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">
                  {formatCurrencyCompact(s.totalTaxes)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-red-600">
                  {idx === 0 ? "—" : `-${formatCurrencyCompact(result.best.tanw - s.tanw)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WithdrawalStrategyChart() {
  const scenario = useStore((s) => s.scenario);
  const [isComputing, setIsComputing] = useState(false);
  const [result, setResult] = useState<WithdrawalComparisonResult | null>(null);
  const [computedScenario, setComputedScenario] = useState<Scenario | null>(null);

  const handleCompute = useCallback(() => {
    setIsComputing(true);
    setTimeout(() => {
      const comparison = compareWithdrawalStrategies(scenario);
      setResult(comparison);
      setComputedScenario({ ...scenario });
      setIsComputing(false);
    }, 50);
  }, [scenario]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Withdrawal Strategy Comparison
          <Button
            size="sm"
            variant="outline"
            onClick={handleCompute}
            disabled={isComputing}
          >
            {isComputing ? <Spinner className="mr-2" /> : null}
            {isComputing ? "Computing..." : result ? "Recompute" : "Analyze"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!result && !isComputing && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Click <strong>Analyze</strong> to compare all withdrawal order strategies and find the one that maximizes your final TANW.
            </p>
            <p className="text-xs">
              This will run 12 simulations testing different account withdrawal sequences.
            </p>
          </div>
        )}
        {isComputing && (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Comparing strategies...</p>
          </div>
        )}
        {result && computedScenario && !isComputing && (
          <ComparisonChart result={result} computedScenario={computedScenario} />
        )}
      </CardContent>
    </Card>
  );
}

