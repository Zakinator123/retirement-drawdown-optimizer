"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { useStore } from "@/lib/store";

export function TaxesChart() {
  const results = useStore((s) => s.results);
  if (!results) return null;

  const data = results.yearRows.map((row) => ({
    age: row.age,
    Ordinary: row.taxOwedOrdinary,
    "Capital Gains": row.taxOwedCapGains,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxes Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" />
            <YAxis tickFormatter={formatCurrencyCompact} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="Ordinary" stackId="a" fill="#0ea5e9" />
            <Bar dataKey="Capital Gains" stackId="a" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
