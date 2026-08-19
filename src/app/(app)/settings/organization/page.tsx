import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import {
  getOrgSettings,
  listPendingApprovalProfiles,
  listPendingJoinRequests,
  listPermissionMatrix,
} from "@/features/settings/organization/queries";
import { listViewerCircles } from "@/features/events/queries";
import { RolesMatrix } from "@/features/settings/organization/components/roles-matrix";
import { PendingApprovalQueue } from "@/features/settings/organization/components/pending-approval-queue";
import { JoinPolicyForm } from "@/features/settings/organization/components/join-policy-form";
import { JoinRequestsQueue } from "@/features/settings/organization/components/join-requests-queue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function OrganizationSettingsPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  if (profile?.role !== "admin") {
    notFound();
  }

  const [orgSettings, joinRequests, pendingApprovals, matrix, circles, headersList, t, tSettings] = await Promise.all([
    getOrgSettings(),
    listPendingJoinRequests(),
    listPendingApprovalProfiles(),
    listPermissionMatrix(),
    listViewerCircles(),
    headers(),
    getTranslations("Roles"),
    getTranslations("Settings"),
  ]);

  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const siteOrigin = `${protocol}://${host}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tSettings("organizationTitle")} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RolesMatrix matrix={matrix} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("pendingApprovalTitle")}</CardTitle>
          <CardDescription>{t("pendingApprovalDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PendingApprovalQueue profiles={pendingApprovals} circles={circles} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tSettings("joinPolicyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <JoinPolicyForm
            joinPolicy={orgSettings?.join_policy ?? "approval_required"}
            inviteLinkToken={orgSettings?.invite_link_token ?? null}
            siteOrigin={siteOrigin}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tSettings("pendingJoinRequestsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <JoinRequestsQueue requests={joinRequests} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tSettings("dataExportTitle")}</CardTitle>
          <CardDescription>{tSettings("dataExportDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" render={<a href="/api/export?table=attendance" />}>
            {tSettings("exportAttendanceButton")}
          </Button>
          <Button variant="outline" className="rounded-full" render={<a href="/api/export?table=homework" />}>
            {tSettings("exportHomeworkButton")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tSettings("auditLogTitle")}</CardTitle>
          <CardDescription>{tSettings("auditLogDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="rounded-full" render={<Link href="/settings/organization/audit" />}>
            {tSettings("viewAuditLogButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
