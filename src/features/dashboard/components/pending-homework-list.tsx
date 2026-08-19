import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatEventDate } from "@/features/events/format";

interface AssignmentLike {
  id: string;
  title: string;
  due_at: string | null;
}

export function PendingHomeworkList({ assignments }: { assignments: AssignmentLike[] }) {
  const t = useTranslations("Dashboard");

  if (assignments.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{t("homeworkNone")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {assignments.map((assignment) => (
        <Link
          key={assignment.id}
          href={`/homework/${assignment.id}`}
          className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50"
        >
          <span className="min-w-0 truncate font-medium text-foreground">{assignment.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {assignment.due_at ? t("homeworkDue", { date: formatEventDate(assignment.due_at) }) : t("homeworkNoDueDate")}
          </span>
        </Link>
      ))}
    </div>
  );
}
