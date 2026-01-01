"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { AccountType } from "@/lib/engine";
import { formatCurrency, formatPercent } from "@/lib/format";
const WITHDRAWAL_ORDER_OPTIONS: Array<{ label: string; order: AccountType[] }> = [
  { label: "Cash → Taxable → IRA → Roth", order: ["cash", "taxable", "ira", "roth"] },
  { label: "Cash → IRA → Taxable → Roth", order: ["cash", "ira", "taxable", "roth"] },
  { label: "Cash → Taxable → Roth → IRA", order: ["cash", "taxable", "roth", "ira"] },
  { label: "Cash → IRA → Roth → Taxable", order: ["cash", "ira", "roth", "taxable"] },
  { label: "Cash → Roth → Taxable → IRA", order: ["cash", "roth", "taxable", "ira"] },
  { label: "Cash → Roth → IRA → Taxable", order: ["cash", "roth", "ira", "taxable"] },
  { label: "IRA → Cash → Taxable → Roth", order: ["ira", "cash", "taxable", "roth"] },
  { label: "IRA → Taxable → Cash → Roth", order: ["ira", "taxable", "cash", "roth"] },
  { label: "IRA → Cash → Roth → Taxable", order: ["ira", "cash", "roth", "taxable"] },
  { label: "Taxable → Cash → IRA → Roth", order: ["taxable", "cash", "ira", "roth"] },
  { label: "Taxable → IRA → Cash → Roth", order: ["taxable", "ira", "cash", "roth"] },
  { label: "Roth → Cash → Taxable → IRA", order: ["roth", "cash", "taxable", "ira"] },
];

const toOrderValue = (order: AccountType[]) => order.join(",");

const TAX_PAYMENT_ORDER_OPTIONS: Array<{ label: string; order: AccountType[] }> = [
  { label: "Cash → Taxable → IRA", order: ["cash", "taxable", "ira"] },
  { label: "Cash → IRA → Taxable", order: ["cash", "ira", "taxable"] },
  { label: "Taxable → Cash → IRA", order: ["taxable", "cash", "ira"] },
  { label: "Taxable → IRA → Cash", order: ["taxable", "ira", "cash"] },
  { label: "IRA → Cash → Taxable", order: ["ira", "cash", "taxable"] },
  { label: "IRA → Taxable → Cash", order: ["ira", "taxable", "cash"] },
];

export function StrategyForm() {
  const scenario = useStore((s) => s.scenario);
  const updateScenario = useStore((s) => s.updateScenario);
  const withdrawalValue = toOrderValue(scenario.withdrawalOrder);
  const taxOrderValue = toOrderValue(scenario.taxPaymentOrder);

  return (
    <Card size="sm" className="mb-4 break-inside-avoid">
      <CardHeader>
        <CardTitle>Withdrawal Strategy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Spending Withdrawal Order</Label>
          <Select
            value={withdrawalValue}
            onValueChange={(next) => {
              const selected = WITHDRAWAL_ORDER_OPTIONS.find(
                (option) => toOrderValue(option.order) === next,
              );
              if (selected) {
                updateScenario({ withdrawalOrder: selected.order });
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WITHDRAWAL_ORDER_OPTIONS.map((option) => (
                <SelectItem key={option.label} value={toOrderValue(option.order)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tax Payment Order</Label>
          <Select
            value={taxOrderValue}
            onValueChange={(next) => {
              const selected = TAX_PAYMENT_ORDER_OPTIONS.find(
                (option) => toOrderValue(option.order) === next,
              );
              if (selected) {
                updateScenario({ taxPaymentOrder: selected.order });
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAX_PAYMENT_ORDER_OPTIONS.map((option) => (
                <SelectItem key={option.label} value={toOrderValue(option.order)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label>Annual Roth Conversion Amount</Label>
            <span className="text-xs font-semibold">
              {formatCurrency(scenario.rothConversionAmount)}
            </span>
          </div>
          <Slider
            value={[scenario.rothConversionAmount]}
            onValueChange={([value]) =>
              updateScenario({ rothConversionAmount: value })
            }
            min={0}
            max={300_000}
            step={1_000}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label>Conversion Age Range</Label>
            <span className="text-xs font-semibold">
              {scenario.rothConversionStartAge}–{scenario.rothConversionEndAge}
            </span>
          </div>
          <Slider
            value={[scenario.rothConversionStartAge, scenario.rothConversionEndAge]}
            onValueChange={([startAge, endAge]) => {
              const nextStart = Math.min(startAge, endAge);
              const nextEnd = Math.max(startAge, endAge);
              updateScenario({
                rothConversionStartAge: Math.max(scenario.startAge, nextStart),
                rothConversionEndAge: Math.min(scenario.endAge, nextEnd),
              });
            }}
            min={scenario.startAge}
            max={scenario.endAge}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label>Assumed IRA Tax Rate (for TANW)</Label>
            <span className="text-xs font-semibold">
              {formatPercent(scenario.assumedIraTaxRate)}
            </span>
          </div>
          <Slider
            value={[scenario.assumedIraTaxRate * 100]}
            onValueChange={([value]) =>
              updateScenario({ assumedIraTaxRate: value / 100 })
            }
            min={0}
            max={40}
            step={0.1}
          />
        </div>
      </CardContent>
    </Card>
  );
}
