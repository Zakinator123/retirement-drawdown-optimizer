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

export function WithdrawalsChart() {
  const results = useStore((s) => s.results);
  if (!results) return null;

  const data = results.yearRows.map((row) => ({
    age: row.age,
    Cash: row.spendingFundedFrom.cash,
    Taxable: row.spendingFundedFrom.taxable,
    IRA: row.spendingFundedFrom.ira,
    Roth: row.spendingFundedFrom.roth,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" />
            <YAxis tickFormatter={formatCurrencyCompact} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="Cash" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Taxable" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="IRA" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Roth" stackId="a" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
