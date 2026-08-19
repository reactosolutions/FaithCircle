"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEvent } from "../../actions";
import { EVENT_RECURRENCES } from "../../schema";
import { useActionToast } from "@/hooks/use-action-toast";
import { useOnActionSuccess } from "@/hooks/use-on-action-success";
import { SegmentedControl } from "./segmented-control";
import { LocationFields } from "./location-fields";
import { MeetingLinkFields } from "./meeting-link-fields";
import { AudienceFields } from "./audience-fields";
import {
  useDurations,
  useFormatOptions,
  useRecurrenceLabel,
  type HostCandidate,
  type InviteCandidate,
  type OtherCircle,
} from "./constants";
import type { ActionResult } from "@/lib/action-result";
import type { EventAudience, EventFormat, EventRecurrence } from "@/lib/database.types";

export function ScheduleEventDialog({
  circleId,
  hosts,
  otherCircles,
  inviteCandidates,
  ownCircleMemberCount,
  defaultStartsAt,
  triggerIcon,
  triggerVariant,
  triggerClassName,
}: {
  circleId: string;
  hosts: HostCandidate[];
  otherCircles: OtherCircle[];
  inviteCandidates: InviteCandidate[];
  ownCircleMemberCount: number;
  // "YYYY-MM-DDTHH:mm" — pre-fills the date/time field when opened from a
  // specific day (e.g. tapping a calendar day box) instead of the generic
  // header trigger.
  defaultStartsAt?: string;
  triggerIcon?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
}) {
  const t = useTranslations("Events");
  const DURATIONS = useDurations();
  const FORMAT_OPTIONS = useFormatOptions();
  const RECURRENCE_LABEL = useRecurrenceLabel();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [format, setFormat] = useState<EventFormat>("in_person");
  const [hostId, setHostId] = useState("");
  const [address, setAddress] = useState("");
  const [meetUrl, setMeetUrl] = useState("");
  const [recurrence, setRecurrence] = useState<EventRecurrence>("none");
  const [audience, setAudience] = useState<EventAudience>("circle");
  const [extraCircleIds, setExtraCircleIds] = useState<string[]>([]);
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    createEvent,
    undefined,
  );
  useActionToast(state, t("scheduledToast"));
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
      triggerLabel={t("scheduleTrigger")}
      triggerIcon={triggerIcon}
      triggerVariant={triggerVariant}
      triggerClassName={triggerClassName}
      title={t("scheduleTitle")}
      description={t("scheduleDescription")}
      dialogContentClassName="sm:max-w-md"
    >
      <form action={formAction} className="flex flex-col gap-4 md:max-h-[70vh] md:overflow-y-auto md:pe-1">
        <input type="hidden" name="circleId" value={circleId} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">{t("titleLabel")}</Label>
          <Input id="title" name="title" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">{t("descriptionLabel")}</Label>
          <Textarea id="description" name="description" rows={3} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startsAt">{t("dateTimeLabel")}</Label>
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={defaultStartsAt}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="durationMinutes">{t("durationLabel")}</Label>
            <input type="hidden" name="durationMinutes" id="durationMinutes-value" defaultValue="90" />
            <Select
              name="duration"
              defaultValue="90"
              onValueChange={(next) => {
                if (!next) return;
                const input = document.getElementById("durationMinutes-value") as HTMLInputElement | null;
                if (input) input.value = next;
              }}
            >
              <SelectTrigger id="durationMinutes" className="w-full">
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
          />
        )}

        {format !== "in_person" && <MeetingLinkFields meetUrl={meetUrl} onMeetUrlChange={setMeetUrl} />}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recurrence">{t("repeatsLabel")}</Label>
          <input type="hidden" name="recurrence" value={recurrence} />
          <Select value={recurrence} onValueChange={(next) => setRecurrence(next as EventRecurrence)}>
            <SelectTrigger id="recurrence" className="w-full">
              <SelectValue>{RECURRENCE_LABEL[recurrence]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {EVENT_RECURRENCES.map((value) => (
                <SelectItem key={value} value={value}>
                  {RECURRENCE_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {recurrence !== "none" && (
            <p className="text-xs text-muted-foreground">{t("recurrenceHint")}</p>
          )}
        </div>

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

        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full rounded-full">
          {pending ? t("schedulingButton") : t("scheduleButton")}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
