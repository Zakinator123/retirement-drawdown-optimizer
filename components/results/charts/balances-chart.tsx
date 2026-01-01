"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { useStore } from "@/lib/store";

export function BalancesChart() {
  const results = useStore((s) => s.results);
  if (!results) return null;

  const data = results.yearRows.map((row) => ({
    age: row.age,
    IRA: row.iraEnd,
    Roth: row.rothEnd,
    Taxable: row.taxableEnd,
    Cash: row.cashEnd,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balances Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" />
            <YAxis tickFormatter={formatCurrencyCompact} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Line type="monotone" dataKey="IRA" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Roth" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Taxable" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Cash" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
