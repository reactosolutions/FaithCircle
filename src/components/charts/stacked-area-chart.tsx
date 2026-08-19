"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmptyState } from "./chart-empty-state";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MAX_MOBILE_X_LABELS, xAxisTickInterval } from "./x-axis-tick-interval";

interface Series {
  key: string;
  label: string;
  color: string;
}

export function StackedAreaChart({
  data,
  series,
}: {
  data: Record<string, number | string>[];
  series: Series[];
}) {
  const isMobile = useIsMobile();
  if (data.length === 0) {
    return <ChartEmptyState icon="area_chart" message="Not enough history yet." />;
  }

  return (
    <div className="flex flex-col gap-2">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId="1"
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
