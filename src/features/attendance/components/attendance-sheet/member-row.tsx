"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { AttendanceStatusToggle } from "../attendance-status-toggle";
import { ModeToggle } from "./mode-toggle";
import type { RowState, SheetMember } from "./types";

export function MemberRow({
  member,
  row,
  isHybrid,
  presentLabel,
  onChange,
}: {
  member: SheetMember;
  row: RowState;
  isHybrid: boolean;
  presentLabel?: string;
  onChange: (patch: Partial<RowState>) => void;
}) {
  const t = useTranslations("Attendance");
  const [expanded, setExpanded] = useState(false);
  const modeDiffersFromRsvp =
    isHybrid && row.mode && member.rsvpAttendMode && row.mode !== member.rsvpAttendMode;

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 text-start"
        >
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {member.fullName ?? t("unnamed")}
          </span>
          {modeDiffersFromRsvp && (
            <span className="shrink-0 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
              {t("differsFromRsvp")}
            </span>
          )}
          <Icon
            name="expand_more"
            size={14}
            className={cn("text-muted-foreground transition-transform", expanded && "rotate-180")}
          />
        </button>
        <AttendanceStatusToggle
          value={row.status}
          onChange={(status) => onChange({ status })}
          presentLabel={presentLabel}
        />
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 ps-0 sm:flex-row sm:items-center sm:gap-3">
          {isHybrid && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t("attendedPrefix")}{" "}
                {member.rsvpAttendMode
                  ? t("rsvpSuffix", {
                      mode: member.rsvpAttendMode === "in_person" ? t("modeInPerson") : t("modeOnline"),
                    })
                  : ""}
              </span>
              <ModeToggle value={row.mode} onChange={(mode) => onChange({ mode })} />
            </div>
          )}
          <Input
            placeholder={t("notePlaceholder")}
            value={row.note}
            onChange={(event) => onChange({ note: event.target.value })}
            className="sm:max-w-56"
          />
        </div>
      )}
    </div>
  );
}
