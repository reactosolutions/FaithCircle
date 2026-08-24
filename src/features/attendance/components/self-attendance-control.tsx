"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AttendanceStatusToggle } from "./attendance-status-toggle";
import { ModeToggle } from "./attendance-sheet/mode-toggle";
import { recordOwnAttendance } from "../actions";
import { notifyActionResult } from "@/lib/notify";
import { isAttendanceOpen } from "@/features/events/format";
import type { AttendMode, AttendanceStatus, EventFormat } from "@/lib/database.types";

// Self-check-in — a member marking their OWN attendance, distinct from the
// leader's roster-wide AttendanceSheet. Auto-saves on toggle (no separate
// Save button), same optimistic pattern as RsvpControl right above it on
// the event detail page.
export function SelfAttendanceControl({
  eventId,
  format,
  initialStatus,
  initialMode,
  startsAt,
}: {
  eventId: string;
  format: EventFormat;
  initialStatus: AttendanceStatus | null;
  initialMode: AttendMode | null;
  startsAt: string;
}) {
  const t = useTranslations("Attendance");
  const [status, setStatus] = useState<AttendanceStatus | null>(initialStatus);
  const [mode, setMode] = useState<AttendMode | null>(
    initialMode ?? (format !== "hybrid" ? (format === "online" ? "online" : "in_person") : null),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const presentLabel = format === "online" ? t("joinedLabel") : undefined;

  // No future-dated self-check-in — see isAttendanceOpen's own comment.
  // The Server Action re-checks this too; this is just so the control
  // doesn't invite a tap that would only bounce.
  if (!isAttendanceOpen(startsAt)) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t("markMyAttendance")}</span>
        <p className="text-xs text-muted-foreground">{t("attendanceOpensOnMeetingDay")}</p>
      </div>
    );
  }

  function save(nextStatus: AttendanceStatus, nextMode: AttendMode | null) {
    setError(null);
    startTransition(async () => {
      const result = await recordOwnAttendance({
        eventId,
        status: nextStatus,
        mode: nextMode ?? undefined,
      });
      if (!result.ok) setError(result.error);
      notifyActionResult(result, t("attendanceSavedToast"));
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{t("markMyAttendance")}</span>
      <div className="flex flex-wrap items-center gap-2">
        <AttendanceStatusToggle
          value={status}
          presentLabel={presentLabel}
          onChange={(next) => {
            setStatus(next);
            save(next, mode);
          }}
        />
        {format === "hybrid" && (
          <ModeToggle
            value={mode}
            onChange={(next) => {
              setMode(next);
              save(status ?? "present", next);
            }}
          />
        )}
      </div>
      {pending && <span className="text-xs text-muted-foreground">{t("savingButton")}</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
