import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { StaggerItem } from "@/components/ui/stagger-item";

interface SubmissionLike {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  circleName: string | null;
  memberName: string | null;
  submittedAt: string;
}

// The admin dashboard's "what just came in" counterpart to
// UpcomingEventsList's "what's coming up" — links into the assignment's
// review page (there's no standalone per-submission page) rather than
// trying to deep-link a single row in that page's queue.
export function RecentSubmissionsList({ submissions }: { submissions: SubmissionLike[] }) {
  const t = useTranslations("Dashboard");

  if (submissions.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{t("noRecentSubmissions")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {submissions.map((row, index) => (
        <StaggerItem key={row.id} index={index}>
          <Link
            href={`/homework/${row.assignmentId}`}
            className="flex flex-col gap-0.5 px-4 py-3 text-sm hover:bg-muted/50"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-medium text-foreground">
                {row.memberName ?? t("unnamedMember")}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(row.submittedAt), { addSuffix: true })}
              </span>
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {row.circleName ? t("submissionCirclePrefix", { title: row.assignmentTitle, circle: row.circleName }) : row.assignmentTitle}
            </span>
          </Link>
        </StaggerItem>
      ))}
    </div>
  );
}
