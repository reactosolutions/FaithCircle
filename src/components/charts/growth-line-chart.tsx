"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmptyState } from "./chart-empty-state";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MAX_MOBILE_X_LABELS, xAxisTickInterval } from "./x-axis-tick-interval";

interface DataPoint {
  label: string;
  value: number;
}

export function GrowthLineChart({ data, height = 180 }: { data: DataPoint[]; height?: number }) {
  const isMobile = useIsMobile();
  if (data.length === 0) {
    return <ChartEmptyState icon="show_chart" message="Not enough history yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={isMobile ? xAxisTickInterval(data.length, MAX_MOBILE_X_LABELS) : 0}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-primary)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
