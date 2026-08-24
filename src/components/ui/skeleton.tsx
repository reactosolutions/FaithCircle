import { cn } from "@/lib/utils"

// Loading indicators are the one thing allowed to loop (CLAUDE.md Motion
// section) — this is the shared pulsing placeholder every route's
// loading.tsx (and any other known-shape loading state) builds on.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
