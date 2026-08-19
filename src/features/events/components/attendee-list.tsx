import { useTranslations } from "next-intl";
import type { AttendMode, ReasonCategory, RsvpResponse } from "@/lib/database.types";

interface AttendeeRow {
  profile_id: string;
  response: RsvpResponse;
  attend_mode: AttendMode | null;
  reason: string | null;
  reason_category: ReasonCategory | null;
  fullName: string | null;
}

function useReasonLabel(): Record<ReasonCategory, string> {
  const t = useTranslations("Events");
  return {
    travel: t("reasonTravel"),
    illness: t("reasonIllness"),
    work: t("reasonWork"),
    family: t("reasonFamily"),
    distance: t("reasonDistance"),
    other: t("reasonOther"),
  };
}

function AttendeeRowItem({ row, showReason }: { row: AttendeeRow; showReason: boolean }) {
  const t = useTranslations("Events");
  const REASON_LABEL = useReasonLabel();
  return (
    <div className="flex min-h-9 flex-col gap-0.5 py-1">
      <span className="text-sm text-foreground">{row.fullName ?? t("unnamed")}</span>
      {showReason && (row.reason_category || row.reason) && (
        <span className="text-xs text-muted-foreground">
          {row.reason_category ? REASON_LABEL[row.reason_category] : null}
          {row.reason_category && row.reason ? " · " : null}
          {row.reason}
        </span>
      )}
    </div>
  );
}

// Four-way split (in person / online / tentative / not attending) — the
// buckets that matter for a leader planning the room. This only reflects
// people who've actually recorded an RSVP; it isn't cross-referenced
// against the full resolved membership list, so it doesn't also track who
// hasn't responded yet.
export function AttendeeList({
  rsvps,
  showReasons,
}: {
  rsvps: AttendeeRow[];
  showReasons: boolean;
}) {
  const t = useTranslations("Events");
  const goingInPerson = rsvps.filter((r) => r.response === "going" && r.attend_mode === "in_person");
  const goingOnline = rsvps.filter((r) => r.response === "going" && r.attend_mode === "online");
  const tentative = rsvps.filter((r) => r.response === "tentative");
  const notGoing = rsvps.filter((r) => r.response === "not_going");

  const groups = [
    { label: t("goingInPerson"), rows: goingInPerson },
    { label: t("goingOnline"), rows: goingOnline },
    { label: t("tentativeGroup"), rows: tentative },
    { label: t("notAttending"), rows: notGoing },
  ].filter((group) => group.rows.length > 0);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noRsvpsYet")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold text-muted-foreground">
            {group.label} ({group.rows.length})
          </h3>
          <div className="flex flex-col divide-y divide-border">
            {group.rows.map((row) => (
              <AttendeeRowItem key={row.profile_id} row={row} showReason={showReasons} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
