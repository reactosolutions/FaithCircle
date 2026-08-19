"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartEmptyState } from "./chart-empty-state";

interface Slice {
  label: string;
  value: number;
  color: string;
}

// A single series never needs a legend box per CLAUDE.md's dataviz
// guidance, but a donut always has ≥2 slices — direct-labeled here via a
// simple legend row underneath rather than in-chart labels, which get
// cramped below md.
export function DonutChart({ data, size = 140 }: { data: Slice[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <ChartEmptyState icon="donut_small" message="No data yet." />;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <ResponsiveContainer width="100%" height={size}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="65%"
            outerRadius="100%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((slice) => (
              <Cell key={slice.label} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [
              `${value} (${Math.round((Number(value) / total) * 100)}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((slice) => (
          <span key={slice.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: slice.color }} />
            {slice.label} ({slice.value})
          </span>
        ))}
      </div>
    </div>
  );
}
