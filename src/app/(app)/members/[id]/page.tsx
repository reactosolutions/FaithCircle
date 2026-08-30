import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMember, getViewerProfile } from "@/features/members/queries";
import { getMemberAttendanceHistory } from "@/features/attendance/queries";
import { getMemberSubmissionHistory } from "@/features/homework/queries";
import { listAllCircles, listCirclesForProfile } from "@/features/circles/queries";
import { AssignCirclesDialog } from "@/features/circles/components/assign-circles-dialog";
import { RoleBadge } from "@/features/members/components/role-badge";
import { StatusBadge } from "@/features/members/components/status-badge";
import { AttendanceHistory } from "@/features/attendance/components/attendance-history";
import { SubmissionHistory } from "@/features/homework/components/submission-history";
import { AuditHistorySection } from "@/features/settings/organization/components/audit-history-section";
import { EditMemberDialog } from "@/features/members/components/edit-member-dialog";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Members");

  // None of these depend on each other's result (they all key off `id` or
  // the viewer, not off `member`'s content) — one parallel round trip
  // instead of fetching `member` first and waiting on it before starting
  // the rest.
  const [member, history, submissions, circles, viewer] = await Promise.all([
    getMember(id),
    getMemberAttendanceHistory(id),
    getMemberSubmissionHistory(id),
    listCirclesForProfile(id),
    getViewerProfile(),
  ]);

  if (!member) {
    notFound();
  }

  const isAdmin = viewer?.role === "admin";
  const assignCandidates = isAdmin
    ? (await listAllCircles()).filter((circle) => !circles.some((c) => c.id === circle.id))
    : [];

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{member.full_name || member.email}</CardTitle>
          {isAdmin && (
            <CardAction>
              <EditMemberDialog
                profileId={id}
                fullName={member.full_name}
                phone={member.phone}
                showAddress
                homeAddress={member.home_address}
                homeMapsUrl={member.home_maps_url}
              />
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <RoleBadge role={member.role} />
            <StatusBadge status={member.status} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("detailEmail")}</dt>
            <dd className="min-w-0 break-words">{member.email || "—"}</dd>
            <dt className="text-muted-foreground">{t("detailPhone")}</dt>
            <dd className="min-w-0 break-words">{member.phone || "—"}</dd>
            <dt className="text-muted-foreground">{t("detailCanHost")}</dt>
            <dd className="min-w-0 break-words">{member.can_host ? t("yes") : t("no")}</dd>
            {(member.home_address || member.home_maps_url) && (
              <>
                <dt className="text-muted-foreground">{t("detailHomeAddress")}</dt>
                <dd className="min-w-0 break-words">
                  {member.home_address || "—"}
                  {member.home_maps_url && (
                    <>
                      {" "}
                      <a
                        href={member.home_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="whitespace-nowrap underline underline-offset-2"
                      >
                        {t("viewOnMap")}
                      </a>
                    </>
                  )}
                </dd>
              </>
            )}
            {member.can_host && (
              <>
                <dt className="text-muted-foreground">{t("detailHostCapacity")}</dt>
                <dd className="min-w-0 break-words">{member.host_capacity ?? "—"}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">{t("circlesTitle")}</CardTitle>
          {isAdmin && <AssignCirclesDialog profileId={id} candidates={assignCandidates} />}
        </CardHeader>
        <CardContent>
          {circles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("notInAnyCircle")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {circles.map((circle) => (
                <li key={circle.id}>
                  <Link href={`/circles/${circle.id}`} className="text-sm font-medium text-primary underline">
                    {circle.name}
                  </Link>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {circle.isAdvisor && circle.isMember
                      ? t("advisorAndMember")
                      : circle.isAdvisor
                        ? t("advisorOnly")
                        : t("memberOnly")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("attendanceHistoryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceHistory entries={history} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("homeworkTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SubmissionHistory entries={submissions} />
        </CardContent>
      </Card>

      <AuditHistorySection tableName="profiles" recordId={id} />
    </div>
  );
}
