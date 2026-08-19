import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getViewerProfile } from "@/features/members/queries";
import { getAssignmentDetail, getReviewQueue } from "@/features/homework/queries";
import { AnswerEditor } from "@/features/homework/components/answer-editor";
import { ReviewQueue } from "@/features/homework/components/review-queue";
import { formatEventDate } from "@/features/events/format";
import { AuditHistorySection } from "@/features/settings/organization/components/audit-history-section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Homework");
  // Independent of each other — one parallel round trip instead of two
  // sequential ones.
  const [result, profile] = await Promise.all([getAssignmentDetail(id), getViewerProfile()]);
  if (!result) {
    notFound();
  }
  const { assignment, circle, mySubmission } = result;

  const supabase = await createClient();
  const user = await getCachedUser();

  // The rule from CLAUDE.md: an administrative user is both author and
  // answerer, and sees both at once — the answer editor above always
  // reflects THEIR OWN submission; this queue is everyone ELSE's, so a
  // leader never ends up reviewing themselves twice on the same page.
  // circle_leaders, not circles.leader_id — a circle can have more than one
  // advisor (see CLAUDE.md's Permissions section), and every one of them
  // should see the review queue, not just the single "primary" leader.
  let isLeader = profile?.role === "admin";
  if (!isLeader && user && circle) {
    const { data: leaderRow } = await supabase
      .from("circle_leaders")
      .select("circle_id")
      .eq("circle_id", circle.id)
      .eq("profile_id", user.id)
      .maybeSingle();
    isLeader = !!leaderRow;
  }
  const reviewRows = isLeader
    ? (await getReviewQueue(id)).filter((row) => row.profile_id !== user?.id)
    : [];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{assignment.title}</CardTitle>
          <CardDescription>
            {circle?.name}
            {assignment.due_at && ` · ${t("dueDate", { date: formatEventDate(assignment.due_at) })}`}
            {assignment.points ? t("pointsSuffix", { points: assignment.points }) : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {assignment.instructions && (
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {assignment.instructions}
            </p>
          )}
          <AnswerEditor
            assignmentId={assignment.id}
            initialAnswerText={mySubmission?.answer_text ?? ""}
            status={mySubmission?.status ?? null}
            feedback={mySubmission?.feedback ?? null}
            score={mySubmission?.score ?? null}
            points={assignment.points}
            questionType={assignment.question_type}
            choices={assignment.choices}
          />
        </CardContent>
      </Card>

      {isLeader && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("reviewSubmissions")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ReviewQueue
              rows={reviewRows.map((row) => ({
                id: row.id,
                memberName: row.memberName,
                status: row.status,
                answerText: row.answer_text,
                feedback: row.feedback,
                score: row.score,
              }))}
              points={assignment.points}
            />
          </CardContent>
        </Card>
      )}

      <AuditHistorySection tableName="assignments" recordId={id} />
    </div>
  );
}
