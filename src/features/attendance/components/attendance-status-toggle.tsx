"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useAttendanceStatusMeta } from "../status-meta";
import type { AttendanceStatus } from "@/lib/database.types";

const ORDER: AttendanceStatus[] = ["present", "excused", "absent"];

export function AttendanceStatusToggle({
  value,
  onChange,
  presentLabel,
}: {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
  // Online-only meetings don't have a "walked into the room" present — the
  // toggle relabels to "Joined" for those without needing a second status
  // enum.
  presentLabel?: string;
}) {
  const ATTENDANCE_STATUS_META = useAttendanceStatusMeta();
  return (
    <div className="inline-flex gap-1 rounded-full border border-border p-1">
      {ORDER.map((status) => {
        const meta = ATTENDANCE_STATUS_META[status];
        const label = status === "present" ? (presentLabel ?? meta.label) : meta.label;
        return (
          <button
            key={status}
            type="button"
            aria-label={label}
            aria-pressed={value === status}
            onClick={() => onChange(status)}
            className={cn(
              "flex min-h-11 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors md:min-h-7 md:py-1",
              value === status ? meta.solidClass : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon name={meta.iconName} size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
