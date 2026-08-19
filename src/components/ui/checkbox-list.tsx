"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface CheckboxListOption {
  id: string
  label: ReactNode
  // Optional trailing detail (e.g. a member count) shown at the row's end.
  meta?: ReactNode
}

// Shared "pick zero or more from a scrollable, bordered list of checkboxes"
// picker — candidate lists for circle creation/roster/advisors and event
// audience pickers all rendered this by hand before this existed, each a
// slightly different copy. Rows are min-h-11 (44px) to meet the app's
// minimum touch target, not min-h-9 like some of those hand-rolled copies.
export function CheckboxList({
  options,
  selectedIds,
  onToggle,
  emptyLabel,
  maxHeightClassName = "max-h-48",
  className,
}: {
  options: CheckboxListOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
  emptyLabel: string
  maxHeightClassName?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2",
        maxHeightClassName,
        className,
      )}
    >
      {options.length === 0 && <p className="p-2 text-sm text-muted-foreground">{emptyLabel}</p>}
      {options.map((option) => (
        <label
          key={option.id}
          className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
        >
          <span className="flex min-w-0 items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.includes(option.id)}
              onChange={() => onToggle(option.id)}
            />
            <span className="min-w-0 truncate">{option.label}</span>
          </span>
          {option.meta !== undefined && (
            <span className="shrink-0 text-xs text-muted-foreground">{option.meta}</span>
          )}
        </label>
      ))}
    </div>
  )
}
