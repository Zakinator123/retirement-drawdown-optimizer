"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { OptimizationResultsView } from "@/components/optimize/optimization-results-view";
import { useStore } from "@/lib/store";

export function OptimizePanel() {
  const runOptimization = useStore((s) => s.runOptimization);
  const optimizationResults = useStore((s) => s.optimizationResults);
  const isSimulating = useStore((s) => s.isSimulating);
  const [enabled, setEnabled] = useState(false);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Optimization
          <label className="flex items-center gap-2 text-sm font-normal">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Enabled
          </label>
        </CardTitle>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <Button
            onClick={() => runOptimization("conversion")}
            disabled={isSimulating}
            className="w-full"
          >
            {isSimulating ? <Spinner /> : "Find Optimal Roth Conversion"}
          </Button>
          <Button
            onClick={() => runOptimization("withdrawal")}
            variant="outline"
            className="w-full"
          >
            Compare Withdrawal Orders
          </Button>
          <Button
            onClick={() => runOptimization("ss")}
            variant="outline"
            className="w-full"
          >
            Compare SS Claim Ages
          </Button>

          {optimizationResults && (
            <OptimizationResultsView results={optimizationResults} />
          )}
        </CardContent>
      )}
    </Card>
  );
}
