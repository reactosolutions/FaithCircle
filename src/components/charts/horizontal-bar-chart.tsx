"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmptyState } from "./chart-empty-state";

interface DataPoint {
  label: string;
  value: number;
}

// Horizontal bars — used for both "absence reasons" (a plain count per
// category) and the submission funnel (assigned → submitted → reviewed,
// which reads as a funnel simply by being sorted largest-to-smallest by
// the caller before this renders).
export function HorizontalBarChart({
  data,
  color = "var(--color-primary)",
  emptyMessage = "Nothing here yet.",
}: {
  data: DataPoint[];
  color?: string;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return <ChartEmptyState icon="bar_chart" message={emptyMessage} />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 32, 80)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--color-border)" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={100}
          tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
