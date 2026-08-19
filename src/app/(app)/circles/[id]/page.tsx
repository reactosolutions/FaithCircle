import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getCircleDetail, listAdvisorCandidates, listStudentCandidates } from "@/features/circles/queries";
import { AdvisorsEditor } from "@/features/circles/components/advisors-editor";
import { CircleRoster } from "@/features/circles/components/circle-roster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("Circles");

  const supabase = await createClient();
  const user = await getCachedUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  if (profile?.role !== "admin") {
    notFound();
  }

  const [detail, advisorCandidates, studentCandidates] = await Promise.all([
    getCircleDetail(id),
    listAdvisorCandidates(),
    listStudentCandidates(),
  ]);
  if (!detail) {
    notFound();
  }

  const memberIds = new Set(detail.members.map((m) => m.id));
  const addCandidates = studentCandidates.filter((s) => !memberIds.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={detail.circle.name}
        description={
          <>
            {t("advisorsCount", { count: detail.advisors.length })} ·{" "}
            {t("membersCount", { count: detail.members.length })}
          </>
        }
        action={
          <Button
            variant="outline"
            className="rounded-full"
            render={<Link href={`/settings/circle?circleId=${detail.circle.id}`} />}
          >
            {t("meetingSettingsButton")}
          </Button>
        }
      />

      {detail.circle.invite_code && (
        <p className="font-mono text-xs text-muted-foreground">
          {detail.circle.join_policy === "open_invite"
            ? t("joinCodeSkipsApproval", { code: detail.circle.invite_code })
            : t("joinCodeNeedsApproval", { code: detail.circle.invite_code })}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("advisorsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdvisorsEditor
            circleId={detail.circle.id}
            currentAdvisors={detail.advisors}
            advisorCandidates={advisorCandidates}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("membersTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CircleRoster circleId={detail.circle.id} members={detail.members} addCandidates={addCandidates} />
        </CardContent>
      </Card>
    </div>
  );
}
