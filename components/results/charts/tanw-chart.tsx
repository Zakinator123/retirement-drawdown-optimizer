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
import { useStore } from "@/lib/store";

export function TanwChart() {
  const results = useStore((s) => s.results);
  if (!results) return null;

  const data = results.yearRows.map((row) => ({
    age: row.age,
    TANW: row.tanw,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax-Adjusted Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" />
            <YAxis tickFormatter={formatCurrencyCompact} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Line type="monotone" dataKey="TANW" stroke="#14b8a6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
