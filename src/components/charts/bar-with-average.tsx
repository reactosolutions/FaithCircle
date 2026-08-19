"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChartEmptyState } from "./chart-empty-state";

interface DataPoint {
  label: string;
  value: number;
}

// Bar chart with a dashed reference line at the average — "attendance
// trend, last 8 meetings, with a dashed average line" for the leader
// dashboard. Animates on mount only (Recharts' own default), never on a
// client-side filter change, since this dashboard has none.
export function BarWithAverage({
  data,
  unit = "",
  showAverage = true,
  emptyMessage = "No meetings yet.",
}: {
  data: DataPoint[];
  unit?: string;
  showAverage?: boolean;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return <ChartEmptyState icon="bar_chart" message={emptyMessage} />;
  }

  const average = Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}${unit}`, ""]}
        />
        {showAverage && (
          <ReferenceLine
            y={average}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: `avg ${average}${unit}`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "var(--color-muted-foreground)",
            }}
          />
        )}
        <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
