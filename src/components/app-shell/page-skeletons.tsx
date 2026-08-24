import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const LINE_WIDTHS = ["w-full", "w-5/6", "w-2/3", "w-1/2"];

// Mirrors PageHeader's gradient box (components/app-shell/page-header.tsx)
// so the layout doesn't jump once the real title/description paint in.
export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-accent/10 px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2 ps-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        {withAction && <Skeleton className="h-11 w-28 rounded-full md:h-8" />}
      </div>
    </div>
  );
}

// The recurring "Card > divide-y rows" list shape used by members, events,
// homework, attendance, notifications, settings index, and more.
export function ListRowsSkeleton({ rows = 5, withTrailing = true }: { rows?: number; withTrailing?: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col divide-y divide-border p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            {withTrailing && <Skeleton className="h-5 w-16 shrink-0 rounded-full" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// A single Card with an optional title bar and a handful of body lines —
// the shape of most settings/detail sections (CardHeader + CardContent).
export function SectionCardSkeleton({ lines = 3, withTitle = true }: { lines?: number; withTitle?: boolean }) {
  return (
    <Card>
      {withTitle && (
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
      )}
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${LINE_WIDTHS[i % LINE_WIDTHS.length]}`} />
        ))}
      </CardContent>
    </Card>
  );
}

// The small stat-card grid on the student/leader dashboard.
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// A "hero" detail card: title bar plus a few full-width lines — the shape
// of the top card on the events/[id], members/[id], homework/[id], and
// attendance/[eventId] detail pages.
export function DetailHeroSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3.5 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${LINE_WIDTHS[i % LINE_WIDTHS.length]}`} />
        ))}
      </CardContent>
    </Card>
  );
}
