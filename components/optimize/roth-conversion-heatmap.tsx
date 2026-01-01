"use client";

import { Fragment, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@/lib/store";
import {
  computeRothConversionGrid,
  RothConversionGridResult,
  RothConversionGridCell,
  Scenario,
} from "@/lib/engine";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/format";

function interpolateColor(
  value: number,
  min: number,
  max: number
): string {
  if (max === min) return "oklch(0.77 0.20 131)";
  
  const t = (value - min) / (max - min);
  
  // Color scale: deep red (bad) -> yellow -> bright green (good)
  // Using oklch for perceptual uniformity
  if (t < 0.5) {
    // Red to yellow
    const localT = t * 2;
    const hue = 25 + localT * 65; // 25 (red) -> 90 (yellow)
    const chroma = 0.18 + localT * 0.05;
    const lightness = 0.55 + localT * 0.20;
    return `oklch(${lightness} ${chroma} ${hue})`;
  } else {
    // Yellow to green
    const localT = (t - 0.5) * 2;
    const hue = 90 + localT * 45; // 90 (yellow) -> 135 (green)
    const chroma = 0.23 - localT * 0.03;
    const lightness = 0.75 + localT * 0.10;
    return `oklch(${lightness} ${chroma} ${hue})`;
  }
}

function HeatmapCell({
  cell,
  minTanw,
  maxTanw,
  isBest,
  isCurrent,
  onHover,
}: {
  cell: RothConversionGridCell;
  minTanw: number;
  maxTanw: number;
  isBest: boolean;
  isCurrent: boolean;
  onHover: (cell: RothConversionGridCell | null) => void;
}) {
  const bgColor = interpolateColor(cell.tanw, minTanw, maxTanw);
  
  return (
    <div
      className="relative aspect-square cursor-crosshair transition-transform hover:scale-110 hover:z-10"
      style={{ backgroundColor: bgColor }}
      onMouseEnter={() => onHover(cell)}
      onMouseLeave={() => onHover(null)}
    >
      {isBest && (
        <div className="absolute inset-0 ring-2 ring-white ring-inset flex items-center justify-center">
          <span className="text-[8px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            ★
          </span>
        </div>
      )}
      {isCurrent && !isBest && (
        <div className="absolute inset-0 ring-2 ring-black/50 ring-inset" />
      )}
    </div>
  );
}

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
          <span className="opacity-70">Inflation:</span> {formatPercent(scenario.inflationRate)}
        </div>
        <div>
          <span className="opacity-70">Tax (ordinary):</span> {formatPercent(scenario.ordinaryIncomeRate)}
        </div>
        <div>
          <span className="opacity-70">Tax (cap gains):</span> {formatPercent(scenario.capitalGainsRate)}
        </div>
        {scenario.ssEnabled && (
          <>
            <div>
              <span className="opacity-70">SS benefit:</span> {formatCurrencyCompact(scenario.ssAnnualBenefit)}
            </div>
            <div>
              <span className="opacity-70">SS claim age:</span> {scenario.ssClaimAge}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HeatmapGrid({ gridResult, computedScenario }: { gridResult: RothConversionGridResult; computedScenario: Scenario }) {
  const [hoveredCell, setHoveredCell] = useState<RothConversionGridCell | null>(null);
  const updateScenario = useStore((s) => s.updateScenario);

  const { cells, amounts, endAges, minTanw, maxTanw, bestCell, currentCell } = gridResult;

  // Create a map for quick cell lookup
  const cellMap = useMemo(() => {
    const map = new Map<string, RothConversionGridCell>();
    for (const cell of cells) {
      map.set(`${cell.amount}-${cell.endAge}`, cell);
    }
    return map;
  }, [cells]);

  const handleApplyBest = useCallback(() => {
    updateScenario({
      rothConversionAmount: bestCell.amount,
      rothConversionEndAge: bestCell.endAge,
    });
  }, [bestCell, updateScenario]);

  const displayCell = hoveredCell || currentCell || bestCell;
  const tanwDiff = displayCell && currentCell ? displayCell.tanw - currentCell.tanw : 0;

  return (
    <div className="space-y-4">
      {/* What's being optimized */}
      <div className="rounded-lg bg-primary/10 p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Optimizing For</div>
        <div className="text-sm">
          <strong>Final Tax-Adjusted Net Worth (TANW)</strong> at age {computedScenario.endAge}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          TANW = total portfolio value minus estimated taxes owed on pre-tax accounts (IRA taxed at {formatPercent(computedScenario.assumedIraTaxRate)})
        </div>
      </div>

      {/* Fixed parameters */}
      <FixedParametersSummary scenario={computedScenario} />

      {/* Results panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {hoveredCell ? "Hovered Cell" : currentCell ? "Your Current Settings" : "Best Found"}
          </div>
          <div className="text-sm font-medium">
            {formatCurrencyCompact(displayCell?.amount ?? 0)}/yr until age {displayCell?.endAge ?? 0}
          </div>
          <div className="text-2xl font-bold tracking-tight text-primary">
            {formatCurrency(displayCell?.tanw ?? 0)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">TANW</span>
          </div>
          {hoveredCell && currentCell && tanwDiff !== 0 && (
            <div className={`text-xs font-medium ${tanwDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
              {tanwDiff >= 0 ? "+" : ""}{formatCurrency(tanwDiff)} vs your current
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 text-right">
          <Button size="sm" onClick={handleApplyBest}>
            Apply Best Settings
          </Button>
          <div className="text-[10px] text-muted-foreground">
            {formatCurrencyCompact(bestCell.amount)}/yr until age {bestCell.endAge}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="relative">
        {/* Y-axis label */}
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
          Conversion End Age
        </div>
        
        <div className="ml-8">
          {/* Grid */}
          <div
            className="grid gap-px bg-border/50 rounded overflow-hidden"
            style={{
              gridTemplateColumns: `auto repeat(${amounts.length}, 1fr)`,
              gridTemplateRows: `repeat(${endAges.length}, 1fr) auto`,
            }}
          >
            {/* Y-axis labels + cells (reversed so higher ages are at top) */}
            {[...endAges].reverse().map((endAge) => (
              <Fragment key={`row-${endAge}`}>
                <div className="flex items-center justify-end pr-2 text-[10px] text-muted-foreground bg-background">
                  {endAge}
                </div>
                {amounts.map((amount) => {
                  const cell = cellMap.get(`${amount}-${endAge}`);
                  if (!cell) return <div key={`${amount}-${endAge}`} className="bg-muted" />;
                  return (
                    <HeatmapCell
                      key={`${amount}-${endAge}`}
                      cell={cell}
                      minTanw={minTanw}
                      maxTanw={maxTanw}
                      isBest={cell.amount === bestCell.amount && cell.endAge === bestCell.endAge}
                      isCurrent={cell.amount === currentCell?.amount && cell.endAge === currentCell?.endAge}
                      onHover={setHoveredCell}
                    />
                  );
                })}
              </Fragment>
            ))}
            
            {/* X-axis labels */}
            <div key="empty-corner" /> {/* Empty corner */}
            {amounts.map((amount, i) => (
              <div
                key={`x-${amount}`}
                className="flex items-start justify-center pt-1 text-[9px] text-muted-foreground bg-background"
              >
                {i % 3 === 0 ? formatCurrencyCompact(amount) : ""}
              </div>
            ))}
          </div>
          
          {/* X-axis label */}
          <div className="text-center text-[10px] font-medium text-muted-foreground mt-1">
            Annual Conversion Amount
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <span>Lower TANW</span>
        <div className="flex h-3 w-32 rounded overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: interpolateColor(i / 19, 0, 1) }}
            />
          ))}
        </div>
        <span>Higher TANW</span>
        <span className="ml-4">★ = Best</span>
        <span className="inline-block w-3 h-3 ring-2 ring-black/50 ring-inset bg-muted" />
        <span>= Current</span>
      </div>

      {/* Explanation of non-monotonic behavior */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">
          Why might results appear non-monotonic?
        </summary>
        <div className="mt-2 space-y-1 pl-4 border-l-2 border-muted">
          <p>
            The relationship between conversion amounts and final TANW is genuinely complex due to interactions between:
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li><strong>RMDs:</strong> Higher conversions deplete your IRA faster, reducing future Required Minimum Distributions</li>
            <li><strong>SS Taxability:</strong> More income pushes more of your Social Security benefits into taxable territory (thresholds at $25k and $34k provisional income)</li>
            <li><strong>IRA Exhaustion:</strong> Very high conversions may exhaust your IRA, stopping conversions early and changing tax dynamics</li>
            <li><strong>Tax Cascading:</strong> Paying taxes from IRA/taxable accounts generates additional taxable income</li>
          </ul>
          <p className="mt-1">
            This means there can be a "sweet spot" conversion amount that minimizes lifetime taxes—higher isn't always better.
          </p>
        </div>
      </details>
    </div>
  );
}

export function RothConversionHeatmap() {
  const scenario = useStore((s) => s.scenario);
  const [isComputing, setIsComputing] = useState(false);
  const [gridResult, setGridResult] = useState<RothConversionGridResult | null>(null);
  const [computedScenario, setComputedScenario] = useState<Scenario | null>(null);

  const handleCompute = useCallback(() => {
    setIsComputing(true);
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const result = computeRothConversionGrid(scenario, {
        amountMin: 0,
        amountMax: 300_000,
        amountStep: 15_000,
        endAgeMin: scenario.startAge,
        endAgeMax: Math.min(scenario.endAge, 85),
        endAgeStep: 2,
      });
      setGridResult(result);
      setComputedScenario({ ...scenario });
      setIsComputing(false);
    }, 50);
  }, [scenario]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Roth Conversion Impact Analysis
          <Button
            size="sm"
            variant="outline"
            onClick={handleCompute}
            disabled={isComputing}
          >
            {isComputing ? <Spinner className="mr-2" /> : null}
            {isComputing ? "Computing..." : gridResult ? "Recompute" : "Analyze"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!gridResult && !isComputing && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Click <strong>Analyze</strong> to see how different Roth conversion amounts and durations affect your final Tax-Adjusted Net Worth.
            </p>
            <p className="text-xs">
              This will run ~300 simulations varying the conversion amount ($0–$300K) and end age, while holding all other parameters fixed.
            </p>
          </div>
        )}
        {isComputing && (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Running simulations...</p>
          </div>
        )}
        {gridResult && computedScenario && !isComputing && (
          <HeatmapGrid gridResult={gridResult} computedScenario={computedScenario} />
        )}
      </CardContent>
    </Card>
  );
}

