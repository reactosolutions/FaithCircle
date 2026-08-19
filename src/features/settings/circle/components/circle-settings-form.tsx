"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWeekdays } from "@/features/settings/preferences/schema";
import { updateCircleSettings } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import type { Database, EventRecurrence } from "@/lib/database.types";

type Circle = Database["public"]["Tables"]["circles"]["Row"];

export function CircleSettingsForm({ circle }: { circle: Circle }) {
  const t = useTranslations("Settings");
  const WEEKDAYS = useWeekdays();
  const RECURRENCE_LABEL: Record<EventRecurrence, string> = {
    none: t("recurrenceNone"),
    weekly: t("recurrenceWeekly"),
    biweekly: t("recurrenceBiweekly"),
    monthly: t("recurrenceMonthly"),
  };
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    updateCircleSettings,
    undefined,
  );
  useActionToast(state, t("circleSettingsSavedToast"));
  const [weekday, setWeekday] = useState(
    circle.default_meeting_weekday === null ? "" : String(circle.default_meeting_weekday),
  );
  const [recurrence, setRecurrence] = useState<EventRecurrence>(circle.default_recurrence);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="circleId" value={circle.id} />
      <input type="hidden" name="defaultMeetingWeekday" value={weekday} />
      <input type="hidden" name="defaultRecurrence" value={recurrence} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input id="name" name="name" defaultValue={circle.name} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">{t("descriptionLabel")}</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={circle.description ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="weekdaySelect">{t("defaultMeetingDayLabel")}</Label>
          <Select value={weekday} onValueChange={(next) => setWeekday(next ?? "")}>
            <SelectTrigger id="weekdaySelect" className="w-full">
              <SelectValue placeholder={t("noDefaultPlaceholder")}>
                {WEEKDAYS.find((d) => d.value === weekday)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((day) => (
                <SelectItem key={day.value} value={day.value}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="defaultMeetingTime">{t("defaultMeetingTimeLabel")}</Label>
          <Input
            id="defaultMeetingTime"
            name="defaultMeetingTime"
            type="time"
            defaultValue={circle.default_meeting_time ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="defaultMeetingDurationMinutes">{t("defaultDurationLabel")}</Label>
          <Input
            id="defaultMeetingDurationMinutes"
            name="defaultMeetingDurationMinutes"
            type="number"
            min={15}
            defaultValue={circle.default_meeting_duration_minutes}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recurrenceSelect">{t("defaultRecurrenceLabel")}</Label>
          <Select value={recurrence} onValueChange={(next) => next && setRecurrence(next as EventRecurrence)}>
            <SelectTrigger id="recurrenceSelect" className="w-full">
              <SelectValue>{RECURRENCE_LABEL[recurrence]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RECURRENCE_LABEL) as EventRecurrence[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {RECURRENCE_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="homeworkDueOffsetDays">{t("homeworkDueOffsetLabel")}</Label>
          <Input
            id="homeworkDueOffsetDays"
            name="homeworkDueOffsetDays"
            type="number"
            min={0}
            defaultValue={circle.homework_due_offset_days ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attendanceFlagThreshold">{t("attendanceFlagThresholdLabel")}</Label>
          <Input
            id="attendanceFlagThreshold"
            name="attendanceFlagThreshold"
            type="number"
            min={1}
            defaultValue={circle.attendance_flag_threshold}
          />
        </div>
      </div>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-success">{t("savedMessage")}</p>}

      <Button type="submit" disabled={pending} className="w-fit rounded-full">
        {pending ? t("savingButton") : t("saveButton")}
      </Button>
    </form>
  );
}
