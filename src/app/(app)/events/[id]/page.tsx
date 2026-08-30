import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getCircleMemberCount,
  getEvent,
  listAllCirclesWithCounts,
  listHostCandidates,
  listInviteCandidates,
} from "@/features/events/queries";
import { getCachedUser } from "@/lib/supabase/server";
import { getViewerProfile } from "@/features/members/queries";
import {
  canJoinMeeting,
  formatEventDate,
  formatEventTime,
  minutesUntilJoinOpens,
} from "@/features/events/format";
import type { MeetProvider } from "@/lib/database.types";
import { RsvpControl } from "@/features/events/components/rsvp-control";
import { SelfAttendanceControl } from "@/features/attendance/components/self-attendance-control";
import { FormatBadge } from "@/features/events/components/format-badge";
import { AttendeeList } from "@/features/events/components/attendee-list";
import { EditEventDialog } from "@/features/events/components/edit-event-dialog";
import { HostVolunteerControl } from "@/features/events/components/host-volunteer-control";
import { AuditHistorySection } from "@/features/settings/organization/components/audit-history-section";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hijri } from "@/lib/format";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Events");
  const MEET_PROVIDER_LABEL: Record<MeetProvider, string> = {
    google_meet: t("meetProviderGoogleMeet"),
    zoom: t("meetProviderZoom"),
    teams: t("meetProviderTeams"),
    other: t("meetProviderOther"),
  };
  // Independent reads (the event itself vs. the viewer's own profile) — run
  // them in parallel rather than paying two sequential Postgres round trips.
  // getViewerProfile() is React cache()-deduped, so this also means the
  // layout's earlier call to it is reused for free instead of re-fetched.
  const [result, profile] = await Promise.all([getEvent(id), getViewerProfile()]);

  if (!result) {
    notFound();
  }

  const { event, circle, host, rsvps, invitedCircles, invitees, attendance } = result;
  const user = await getCachedUser();

  const ownRsvp = rsvps.find((r) => r.profile_id === user?.id);
  const ownAttendance = attendance.find((a) => a.profile_id === user?.id);
  const goingCount = rsvps.filter((r) => r.response === "going").length;
  const isLeader = profile?.role === "admin" || circle?.leader_id === user?.id;

  // meet_url only ever reaches this component if RLS already let the row
  // through — events_select requires the viewer to be the owning circle's
  // leader/admin or a resolved member (event_circles ∪ event_invitees), so
  // there's no separate "am I allowed to see this link" check to do here.
  const canJoin = event.meet_url ? canJoinMeeting(event.starts_at, event.ends_at) : false;
  const minutesUntilOpen = event.meet_url ? minutesUntilJoinOpens(event.starts_at) : 0;

  const inPersonGoing = rsvps.filter(
    (r) => r.response === "going" && r.attend_mode === "in_person",
  ).length;
  const overCapacity =
    event.in_person_capacity != null && inPersonGoing > event.in_person_capacity;

  // Edit-form data (host/invite pickers, other circles) is only ever used
  // by the EditEventDialog rendered below — skip the extra round trips
  // entirely for anyone who can't edit this meeting. A leader/admin can
  // edit any meeting in their circle; a student can edit one they created
  // themselves (events.edit 'own' scope, keyed on events.created_by).
  const canEdit = !!circle && (isLeader || event.created_by === user?.id);
  const [hosts, inviteCandidates, allCirclesWithCounts, ownCircleMemberCount] =
    canEdit && circle
      ? await Promise.all([
          listHostCandidates(circle.id),
          listInviteCandidates(circle.id),
          listAllCirclesWithCounts(),
          getCircleMemberCount(circle.id),
        ])
      : [[], [], [], 0];

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{event.title}</CardTitle>
            <FormatBadge format={event.format} />
          </div>
          {circle && <p className="text-sm text-muted-foreground">{circle.name}</p>}
          {canEdit && circle && (
            <CardAction>
              <EditEventDialog
                event={event}
                hosts={hosts}
                inviteCandidates={inviteCandidates}
                otherCircles={allCirclesWithCounts.filter((c) => c.id !== circle.id)}
                ownCircleMemberCount={ownCircleMemberCount}
                initialExtraCircleIds={invitedCircles.map((c) => c.circleId).filter((id) => id !== circle.id)}
                initialInviteeIds={invitees.map((i) => i.profileId)}
                triggerIcon="edit"
                triggerVariant="outline"
              />
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">
              {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}
            </span>
            {profile?.show_hijri_dates && (
              <span className="text-xs text-muted-foreground">
                {hijri(new Date(event.starts_at), profile.language)}
              </span>
            )}
          </div>

          {event.description && <p className="text-sm text-foreground">{event.description}</p>}

          {(invitedCircles.length > 0 || invitees.length > 0) && (
            <p className="text-xs text-muted-foreground">
              {t("alsoInvited", {
                names: [
                  ...invitedCircles.map((c) => c.name),
                  ...invitees.map((i) => i.fullName ?? t("someone")),
                ].join(", "),
              })}
            </p>
          )}

          {event.format !== "online" && (
            <div className="flex flex-col items-start gap-1 rounded-lg border border-border p-3 text-sm">
              <span className="font-medium text-foreground">
                {host ? t("hostedBy", { name: host.full_name ?? t("unnamed") }) : t("noHostAssigned")}
              </span>
              {event.address && <span className="text-muted-foreground">{event.address}</span>}
              {event.in_person_capacity != null && (
                <span className={overCapacity ? "text-destructive" : "text-muted-foreground"}>
                  {t("inPersonSpots", { going: inPersonGoing, capacity: event.in_person_capacity })}
                  {overCapacity ? t("overCapacitySuffix") : ""}
                </span>
              )}
              {user && (
                <HostVolunteerControl
                  eventId={event.id}
                  startsAt={event.starts_at}
                  isCurrentHost={event.host_id === user.id}
                  triggerClassName="mt-1"
                />
              )}
            </div>
          )}

          {event.format !== "in_person" && event.meet_url && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm">
              <span className="font-medium text-foreground">
                {event.meet_provider ? MEET_PROVIDER_LABEL[event.meet_provider] : t("meetingLinkFallback")}
              </span>
              {event.meet_notes && <span className="text-muted-foreground">{event.meet_notes}</span>}
              {canJoin ? (
                <Button size="sm" className="w-fit rounded-full" render={<a href={event.meet_url} target="_blank" rel="noreferrer" />}>
                  {t("joinMeeting")}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {minutesUntilOpen > 0 ? t("linkOpensIn", { minutes: minutesUntilOpen }) : t("linkOpensSoon")}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Badge variant="outline">{t("peopleGoing", { count: goingCount })}</Badge>
            {event.recurrence !== "none" && <Badge variant="outline">{t("recurring")}</Badge>}
          </div>

          {user && (
            <RsvpControl
              eventId={event.id}
              format={event.format}
              initialResponse={ownRsvp?.response ?? "no_response"}
              initialAttendMode={ownRsvp?.attend_mode ?? null}
              initialReasonCategory={ownRsvp?.reason_category ?? null}
              initialReason={ownRsvp?.reason ?? null}
            />
          )}

          {user && (
            <SelfAttendanceControl
              eventId={event.id}
              format={event.format}
              initialStatus={ownAttendance?.status ?? null}
              initialMode={ownAttendance?.mode ?? null}
              startsAt={event.starts_at}
            />
          )}
        </CardContent>
      </Card>

      {isLeader && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("attendeesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* reason/reason_category are admin-only now (see
                schema.sql's event_rsvps_visible) — the data itself already
                comes back redacted for a leader, but showReasons also
                keeps the "why" line from rendering an empty gap for them. */}
            <AttendeeList rsvps={rsvps} showReasons={profile?.role === "admin"} />
          </CardContent>
        </Card>
      )}

      <AuditHistorySection tableName="events" recordId={id} />
    </div>
  );
}
