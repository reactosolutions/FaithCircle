"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberRow } from "./member-row";
import { useGroupLabel, type RowState, type SheetMember } from "./types";
import { saveAttendance } from "../../actions";
import { notifyActionResult } from "@/lib/notify";
import { isAttendanceOpen } from "@/features/events/format";
import type { AttendanceStatus, EventFormat } from "@/lib/database.types";

export function AttendanceSheet({
  eventId,
  format,
  members,
  startsAt,
}: {
  eventId: string;
  format: EventFormat;
  members: SheetMember[];
  startsAt: string;
}) {
  const t = useTranslations("Attendance");
  const groupLabel = useGroupLabel();
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      members.map((member) => [
        member.id,
        {
          status: member.attendance?.status ?? null,
          note: member.attendance?.note ?? "",
          mode: member.attendance?.mode ?? member.rsvpAttendMode ?? (format !== "hybrid" ? (format === "online" ? "online" : "in_person") : null),
        },
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const presentLabel = format === "online" ? t("joinedLabel") : undefined;
  const isHybrid = format === "hybrid";

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter((member) => (member.fullName ?? "").toLowerCase().includes(q));
  }, [members, search]);

  const groups = useMemo(() => {
    if (!isHybrid) return [{ key: "all" as const, members: filteredMembers }];
    const inPerson = filteredMembers.filter((m) => m.rsvpAttendMode === "in_person");
    const online = filteredMembers.filter((m) => m.rsvpAttendMode === "online");
    const other = filteredMembers.filter((m) => !m.rsvpAttendMode);
    return [
      { key: "in_person" as const, members: inPerson },
      { key: "online" as const, members: online },
      { key: "other" as const, members: other },
    ].filter((group) => group.members.length > 0);
  }, [filteredMembers, isHybrid]);

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, excused: 0, unmarked: 0 };
    for (const row of Object.values(rows)) {
      if (row.status) counts[row.status] += 1;
      else counts.unmarked += 1;
    }
    return counts;
  }, [rows]);

  function setRow(profileId: string, patch: Partial<RowState>) {
    setSaved(false);
    setRows((prev) => ({ ...prev, [profileId]: { ...prev[profileId], ...patch } }));
  }

  function markAllPresent() {
    setSaved(false);
    setRows((prev) => {
      const next = { ...prev };
      for (const member of members) {
        next[member.id] = { ...next[member.id], status: "present" };
      }
      return next;
    });
  }

  function handleSave() {
    setError(null);
    const entries = members
      .filter((member) => rows[member.id]?.status)
      .map((member) => ({
        profileId: member.id,
        status: rows[member.id].status as AttendanceStatus,
        note: rows[member.id].note || undefined,
        mode: rows[member.id].mode ?? undefined,
      }));

    if (entries.length === 0) {
      setError(t("markAtLeastOne"));
      return;
    }

    startTransition(async () => {
      const result = await saveAttendance({ eventId, entries });
      if (!result.ok) {
        setError(result.error);
      } else {
        setSaved(true);
      }
      notifyActionResult(result, t("attendanceSavedToast"));
    });
  }

  // No future-dated attendance — see isAttendanceOpen's own comment. The
  // Server Action re-checks this too; this just keeps the roster from
  // inviting taps that would only bounce.
  if (!isAttendanceOpen(startsAt)) {
    return <EmptyState icon="schedule" title={t("attendanceOpensOnMeetingDay")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-lg border border-border bg-card/95 px-4 py-3 text-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-success">
              {summary.present} {presentLabel ?? t("presentCountSuffix")}
            </span>
            <span className="text-warning">{summary.excused} {t("excusedCountSuffix")}</span>
            <span className="text-destructive">{summary.absent} {t("absentCountSuffix")}</span>
            <span className="text-muted-foreground">{summary.unmarked} {t("unmarkedCountSuffix")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {searchOpen ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  placeholder={t("searchMembersPlaceholder")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-9 w-40"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearch("");
                  }}
                >
                  <Icon name="close" size={18} />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => setSearchOpen(true)}
                aria-label={t("searchMembersAriaLabel")}
              >
                <Icon name="search" size={18} />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={markAllPresent}
            >
              {t("markAllPresent", { label: presentLabel ?? t("presentCountSuffix") })}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {groups.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">{t("noMembersMatchSearch")}</p>
        )}
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-1">
            {isHybrid && (
              <h3 className="px-1 text-xs font-semibold text-muted-foreground">
                {groupLabel(group.key as "in_person" | "online" | "other")} ({group.members.length})
              </h3>
            )}
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {group.members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  row={rows[member.id]}
                  isHybrid={isHybrid}
                  presentLabel={presentLabel}
                  onChange={(patch) => setRow(member.id, patch)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-24 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/95 px-4 py-3 backdrop-blur md:bottom-4">
        <div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {saved && !error && <p className="text-sm text-success">{t("attendanceSavedToast")}</p>}
        </div>
        <Button type="button" disabled={pending} className="rounded-full" onClick={handleSave}>
          {pending ? t("savingButton") : t("saveAttendanceButton")}
        </Button>
      </div>
    </div>
  );
}
