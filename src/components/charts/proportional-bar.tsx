import { ChartEmptyState } from "./chart-empty-state";

interface Segment {
  label: string;
  value: number;
  color: string;
}

// Single-row horizontal stacked bar (homework completion: reviewed /
// submitted / pending / late) — plain CSS, not Recharts; a proportional
// bar is simpler as flex widths than as a chart, and matches the meter
// pattern already used in AttendanceHistory.
export function ProportionalBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return <ChartEmptyState icon="menu_book" message="No homework yet." />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  );
}
