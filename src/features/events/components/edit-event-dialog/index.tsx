"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateEvent } from "../../actions";
import { EVENT_EDIT_SCOPES } from "../../schema";
import { toDateTimeLocalValue } from "../../format";
import { useActionToast } from "@/hooks/use-action-toast";
import { useOnActionSuccess } from "@/hooks/use-on-action-success";
import { SegmentedControl } from "../schedule-event-dialog/segmented-control";
import { LocationFields } from "../schedule-event-dialog/location-fields";
import { MeetingLinkFields } from "../schedule-event-dialog/meeting-link-fields";
import { AudienceFields } from "../schedule-event-dialog/audience-fields";
import {
  useDurations,
  useFormatOptions,
  type HostCandidate,
  type InviteCandidate,
  type OtherCircle,
} from "../schedule-event-dialog/constants";
import type { ActionResult } from "@/lib/action-result";
import type { EventAudience, EventFormat } from "@/lib/database.types";

type EditScope = (typeof EVENT_EDIT_SCOPES)[number];

function useEditScopeLabel(): Record<EditScope, string> {
  const t = useTranslations("Events");
  return {
    this: t("editScopeThis"),
    upcoming: t("editScopeUpcoming"),
    series: t("editScopeSeries"),
  };
}

interface EditableEvent {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  format: EventFormat;
  host_id: string | null;
  address: string | null;
  in_person_capacity: number | null;
  meet_url: string | null;
  meet_notes: string | null;
  audience: EventAudience;
  recurrence: string;
  parent_event_id: string | null;
}

// The edit counterpart to ScheduleEventDialog — same fields, pre-filled
// from the existing row, reusing its location/meeting-link/audience
// subcomponents. Two differences: no circle picker (the owning circle
// never changes here) and no recurrence picker (editing never changes the
// pattern — see editEventSchema's comment) — instead, a scope picker
// shown only when the event is actually part of a series.
export function EditEventDialog({
  event,
  hosts,
  inviteCandidates,
  otherCircles,
  ownCircleMemberCount,
  initialExtraCircleIds,
  initialInviteeIds,
  triggerIcon,
  triggerVariant,
  triggerClassName,
}: {
  event: EditableEvent;
  hosts: HostCandidate[];
  inviteCandidates: InviteCandidate[];
  otherCircles: OtherCircle[];
  ownCircleMemberCount: number;
  initialExtraCircleIds: string[];
  initialInviteeIds: string[];
  triggerIcon?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
}) {
  const t = useTranslations("Events");
  const DURATIONS = useDurations();
  const FORMAT_OPTIONS = useFormatOptions();
  const EDIT_SCOPE_LABEL = useEditScopeLabel();

  // A root event carries its own recurrence; a generated occurrence copies
  // its parent's recurrence value onto its own row too, so either check
  // alone would miss a case the other catches (an edited-then-orphaned
  // child, a root whose value was somehow cleared) — both together are the
  // reliable "is this actually part of a series" test.
  const isRecurring = event.recurrence !== "none" || event.parent_event_id !== null;

  const rawDurationMinutes = event.ends_at
    ? Math.round((new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60_000)
    : 90;
  const initialDuration = DURATIONS.some((d) => d.value === String(rawDurationMinutes))
    ? String(rawDurationMinutes)
    : "90";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [scope, setScope] = useState<EditScope>("this");
  const [format, setFormat] = useState<EventFormat>(event.format);
  const [hostId, setHostId] = useState(event.host_id ?? "");
  const [address, setAddress] = useState(event.address ?? "");
  const [meetUrl, setMeetUrl] = useState(event.meet_url ?? "");
  const [audience, setAudience] = useState<EventAudience>(event.audience);
  const [extraCircleIds, setExtraCircleIds] = useState<string[]>(initialExtraCircleIds);
  const [inviteeIds, setInviteeIds] = useState<string[]>(initialInviteeIds);
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    updateEvent,
    undefined,
  );
  useActionToast(state, t("changesSavedToast"));
  useOnActionSuccess(state, () => {
    setMobileOpen(false);
    setDesktopOpen(false);
  });

  const invitedCount =
    ownCircleMemberCount +
    otherCircles.filter((c) => extraCircleIds.includes(c.id)).reduce((sum, c) => sum + c.memberCount, 0) +
    inviteeIds.length;

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("editTrigger")}
      triggerIcon={triggerIcon ?? "edit"}
      triggerVariant={triggerVariant ?? "outline"}
      triggerClassName={triggerClassName}
      title={t("editTitle")}
      description={t("editDescription")}
      dialogContentClassName="sm:max-w-md"
    >
      <form action={formAction} className="flex flex-col gap-4 md:max-h-[70vh] md:overflow-y-auto md:pe-1">
        <input type="hidden" name="eventId" value={event.id} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-title">{t("titleLabel")}</Label>
          <Input id="edit-title" name="title" defaultValue={event.title} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-description">{t("descriptionLabel")}</Label>
          <Textarea
            id="edit-description"
            name="description"
            rows={3}
            defaultValue={event.description ?? ""}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-startsAt">{t("dateTimeLabel")}</Label>
            <Input
              id="edit-startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(event.starts_at)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-durationMinutes">{t("durationLabel")}</Label>
            <input
              type="hidden"
              name="durationMinutes"
              id="edit-durationMinutes-value"
              defaultValue={initialDuration}
            />
            <Select
              name="duration"
              defaultValue={initialDuration}
              onValueChange={(next) => {
                if (!next) return;
                const input = document.getElementById(
                  "edit-durationMinutes-value",
                ) as HTMLInputElement | null;
                if (input) input.value = next;
              }}
            >
              <SelectTrigger id="edit-durationMinutes" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("formatLabel")}</Label>
          <input type="hidden" name="format" value={format} />
          <SegmentedControl options={FORMAT_OPTIONS} value={format} onChange={setFormat} />
        </div>

        {format !== "online" && (
          <LocationFields
            hosts={hosts}
            hostId={hostId}
            onHostIdChange={setHostId}
            address={address}
            onAddressChange={setAddress}
            defaultInPersonCapacity={event.in_person_capacity}
          />
        )}

        {format !== "in_person" && (
          <MeetingLinkFields
            meetUrl={meetUrl}
            onMeetUrlChange={setMeetUrl}
            defaultMeetNotes={event.meet_notes}
          />
        )}

        <AudienceFields
          audience={audience}
          onAudienceChange={setAudience}
          otherCircles={otherCircles}
          extraCircleIds={extraCircleIds}
          onExtraCircleIdsChange={setExtraCircleIds}
          inviteCandidates={inviteCandidates}
          inviteeIds={inviteeIds}
          onInviteeIdsChange={setInviteeIds}
          invitedCount={invitedCount}
        />

        <input type="hidden" name="scope" value={isRecurring ? scope : "this"} />
        {isRecurring && (
          <div className="flex flex-col gap-1.5">
            <Label>{t("editScopeLabel")}</Label>
            <SegmentedControl<EditScope>
              options={EVENT_EDIT_SCOPES.map((value) => ({ value, label: EDIT_SCOPE_LABEL[value] }))}
              value={scope}
              onChange={setScope}
            />
            <p className="text-xs text-muted-foreground">{t("editScopeHint")}</p>
          </div>
        )}

        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full rounded-full">
          {pending ? t("savingChangesButton") : t("saveChangesButton")}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
