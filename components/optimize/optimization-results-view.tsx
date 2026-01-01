"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";
import { OptimizationResult } from "@/lib/engine";
import { SensitivityChart } from "@/components/optimize/sensitivity-chart";

export function OptimizationResultsView({
  results,
}: {
  results: OptimizationResult;
}) {
  const applyScenario = useStore((s) => s.applyOptimizedScenario);
  const scores = results.variants.map((variant) => variant.score);
  const allSame =
    scores.length > 1 && scores.every((score) => score === scores[0]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold text-muted-foreground">
          Best Result
        </div>
        <div className="text-lg font-semibold">
          {formatCurrency(results.bestScore)}
        </div>
        <div className="text-xs text-muted-foreground">
          Scores represent final tax-adjusted net worth (TANW).
        </div>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => applyScenario(results.bestScenario)}
        >
          Apply Best Scenario
        </Button>
      </Card>

      <SensitivityChart results={results} />

      <div className="space-y-2">
        {results.variants.length === 0 ? (
          <Card className="p-3 text-sm text-muted-foreground">
            No variants to compare for the current settings.
          </Card>
        ) : allSame ? (
          <Card className="p-3 text-sm text-muted-foreground">
            All scenario variants produce the same TANW, so the list is hidden.
          </Card>
        ) : (
          results.variants.slice(0, 6).map((variant) => (
            <Card key={variant.label} className="flex items-center justify-between p-3">
              <span className="text-sm">{variant.label}</span>
              <span className="text-sm font-semibold">
                {formatCurrency(variant.score)}
              </span>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
