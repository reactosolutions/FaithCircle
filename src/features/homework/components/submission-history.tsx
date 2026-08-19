import { useTranslations } from "next-intl";
import { formatEventDate } from "@/features/events/format";
import { SubmissionStatusBadge } from "./submission-status-badge";
import type { SubmissionStatus } from "@/lib/database.types";

interface HistoryEntry {
  id: string;
  status: SubmissionStatus;
  score: number | null;
  submitted_at: string | null;
  assignmentTitle: string;
  maxPoints: number | null;
}

export function SubmissionHistory({ entries }: { entries: HistoryEntry[] }) {
  const t = useTranslations("Homework");
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noHomeworkSubmittedYet")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="min-w-0 truncate font-medium text-foreground">{entry.assignmentTitle}</span>
            <span className="text-xs text-muted-foreground">
              {entry.submitted_at ? formatEventDate(entry.submitted_at) : t("notSubmitted")}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {entry.score !== null && (
              <span className="text-xs text-muted-foreground">
                {entry.score}
                {entry.maxPoints ? ` / ${entry.maxPoints}` : ""}
              </span>
            )}
            <SubmissionStatusBadge status={entry.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
