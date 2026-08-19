import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getViewerProfile } from "@/features/members/queries";
import {
  getCircleSettings,
  listLedCircles,
  suggestNextHost,
} from "@/features/settings/circle/queries";
import { CircleSettingsForm } from "@/features/settings/circle/components/circle-settings-form";
import { CircleInviteForm } from "@/features/settings/circle/components/circle-invite-form";
import { HostRotationHint } from "@/features/settings/circle/components/host-rotation-hint";
import { CircleSelect } from "@/features/events/components/circle-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function CircleSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ circleId?: string }>;
}) {
  const profile = await getViewerProfile();

  if (profile?.role !== "admin" && profile?.role !== "administrative") {
    notFound();
  }

  const t = await getTranslations("Settings");
  const circles = await listLedCircles();
  if (circles.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("circleTitle")} />
        <p className="text-sm text-muted-foreground">{t("notLeadingCircle")}</p>
      </div>
    );
  }

  const params = await searchParams;
  const circleId =
    params.circleId && circles.some((c) => c.id === params.circleId) ? params.circleId : circles[0].id;

  const circle = await getCircleSettings(circleId);
  if (!circle) {
    notFound();
  }

  const hostCandidates = await suggestNextHost(circleId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("circleTitle")}>
        {circles.length > 1 && <CircleSelect circles={circles} value={circleId} />}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("defaultsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CircleSettingsForm circle={circle} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("inviteDirectlyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CircleInviteForm
            circleId={circle.id}
            joinPolicy={circle.join_policy}
            inviteCode={circle.invite_code}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("hostRotationTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <HostRotationHint candidates={hostCandidates} />
        </CardContent>
      </Card>
    </div>
  );
}
