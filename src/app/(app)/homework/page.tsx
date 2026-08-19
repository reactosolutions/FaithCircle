import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listAssignmentsForViewer } from "@/features/homework/queries";
import { listViewerCircles } from "@/features/events/queries";
import { HomeworkTabs } from "@/features/homework/components/homework-tabs";
import { HomeworkFilters } from "@/features/homework/components/homework-filters";
import { SubmissionStatusBadge } from "@/features/homework/components/submission-status-badge";
import { CreateAssignmentDialog } from "@/features/homework/components/create-assignment-dialog";
import { formatEventDate } from "@/features/events/format";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { getViewerProfile } from "@/features/members/queries";
import type { SubmissionStatus } from "@/lib/database.types";

type Tab = "todo" | "submitted" | "reviewed" | "all";

function matchesTab(myStatus: SubmissionStatus | null, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "todo") return myStatus === null || myStatus === "draft";
  return myStatus === tab;
}

export default async function HomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; circleId?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Homework");
  const tab: Tab =
    params.tab === "submitted" || params.tab === "reviewed" || params.tab === "all"
      ? params.tab
      : "todo";

  const profile = await getViewerProfile();
  const canCreate = profile?.role === "admin" || profile?.role === "administrative";

  const [assignments, viewerCircles] = await Promise.all([
    listAssignmentsForViewer(),
    canCreate ? listViewerCircles() : Promise.resolve([]),
  ]);
  const circleOptions = Array.from(new Map(assignments.map((a) => [a.circle_id, a.circleName])))
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const circleFilter =
    params.circleId && circleOptions.some((c) => c.id === params.circleId) ? params.circleId : null;

  const visible = assignments
    .filter((assignment) => !circleFilter || assignment.circle_id === circleFilter)
    .filter((assignment) => matchesTab(assignment.myStatus, tab));

  const showCircleName = circleOptions.length > 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={canCreate && <CreateAssignmentDialog circles={viewerCircles} />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <HomeworkTabs current={tab} />
        {showCircleName && <HomeworkFilters circles={circleOptions} />}
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {visible.length === 0 && (
            <EmptyState
              icon="menu_book"
              title={tab === "todo" ? t("caughtUp") : t("nothingHereYet")}
            />
          )}
          {visible.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/homework/${assignment.id}`}
              className="flex flex-col gap-3 px-6 py-4 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-medium text-foreground">
                  {assignment.title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {showCircleName && `${assignment.circleName} · `}
                  {assignment.due_at ? t("dueDate", { date: formatEventDate(assignment.due_at) }) : t("noDueDate")}
                  {assignment.points ? t("pointsSuffix", { points: assignment.points }) : ""}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {assignment.myStatus === "reviewed" && assignment.myScore !== null && (
                  <span className="text-xs text-muted-foreground">
                    {assignment.myScore}/{assignment.points ?? "—"}
                  </span>
                )}
                <SubmissionStatusBadge status={assignment.myStatus} />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
