"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { OptimizationResult } from "@/lib/engine";

export function SensitivityChart({ results }: { results: OptimizationResult }) {
  const data = results.variants.map((variant, index) => ({
    index,
    score: variant.score,
    label: variant.label,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimization Sensitivity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="index"
              tickFormatter={(value) => `${Number(value) + 1}`}
              label={{ value: "Scenario Index", position: "insideBottom", offset: -6 }}
            />
            <YAxis tickFormatter={formatCurrencyCompact} />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.label ?? label
              }
            />
            <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground">
          Each point is a scenario variant in list order; hover to see the exact label.
        </p>
      </CardContent>
    </Card>
  );
}
