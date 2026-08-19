import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getViewerProfile } from "@/features/members/queries";
import { getCircleDetail, listAdvisorCandidates, listStudentCandidates } from "@/features/circles/queries";
import { AdvisorsEditor } from "@/features/circles/components/advisors-editor";
import { CircleRoster } from "@/features/circles/components/circle-roster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("Circles");

  const [profile, detail] = await Promise.all([getViewerProfile(), getCircleDetail(id)]);
  if (!detail) {
    notFound();
  }

  const isAdmin = profile?.role === "admin";
  const isLeaderOfThisCircle = detail.advisors.some((a) => a.id === profile?.id);
  const isMemberOfThisCircle = detail.members.some((m) => m.id === profile?.id);

  // Same access level members.view already grants: admin sees every
  // circle, everyone else only circles they lead or belong to (matches
  // this circle's own roster/RLS, not a separate rule invented here).
  if (!isAdmin && !isLeaderOfThisCircle && !isMemberOfThisCircle) {
    notFound();
  }

  // A leader can add/remove members of a circle they lead (members.invite's
  // 'circle' scope) — a plain member can only view. Assigning WHO leads a
  // circle (AdvisorsEditor) is a role-management action, admin-only
  // (roles.assign_administrative), regardless of leadership here.
  const canManageRoster = isAdmin || isLeaderOfThisCircle;

  const [advisorCandidates, studentCandidates] = await Promise.all([
    isAdmin ? listAdvisorCandidates() : Promise.resolve([]),
    canManageRoster ? listStudentCandidates() : Promise.resolve([]),
  ]);

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
          canManageRoster && (
            <Button
              variant="outline"
              className="rounded-full"
              render={<Link href={`/settings/circle?circleId=${detail.circle.id}`} />}
            >
              {t("meetingSettingsButton")}
            </Button>
          )
        }
      />

      {/* The join code lets anyone in (skipping approval, on an open_invite
          circle) — only shown to people who could already act on it. */}
      {canManageRoster && detail.circle.invite_code && (
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
          {isAdmin ? (
            <AdvisorsEditor
              circleId={detail.circle.id}
              currentAdvisors={detail.advisors}
              advisorCandidates={advisorCandidates}
            />
          ) : detail.advisors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAdvisorsYet")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm text-foreground">
              {detail.advisors.map((advisor) => (
                <li key={advisor.id}>{advisor.full_name ?? t("unnamed")}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("membersTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CircleRoster
            circleId={detail.circle.id}
            members={detail.members}
            addCandidates={addCandidates}
            canManage={canManageRoster}
          />
        </CardContent>
      </Card>
    </div>
  );
}
