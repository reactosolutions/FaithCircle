"use client";

import { cn } from "@/lib/utils";
import { useModeOptions } from "./types";
import type { AttendMode } from "@/lib/database.types";

export function ModeToggle({
  value,
  onChange,
}: {
  value: AttendMode | null;
  onChange: (mode: AttendMode) => void;
}) {
  const MODE_OPTIONS = useModeOptions();
  return (
    <div className="inline-flex gap-1 rounded-full border border-border p-1">
      {MODE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-11 rounded-full px-2.5 text-xs font-medium transition-colors md:min-h-7 md:py-1",
            value === option.value
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
