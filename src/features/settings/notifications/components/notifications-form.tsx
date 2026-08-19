"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NOTIFICATION_TYPES,
  useNotificationTypeLabel,
  REMINDER_LEAD_TIMES,
  useReminderLeadTimeLabel,
} from "../schema";
import { updateNotifications } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import type { NotificationPrefs, ReminderLeadTime } from "@/lib/database.types";

export function NotificationsForm({
  prefs,
  reminderLeadTime,
  quietHoursStart,
  quietHoursEnd,
}: {
  prefs: NotificationPrefs;
  reminderLeadTime: ReminderLeadTime;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}) {
  const t = useTranslations("Settings");
  const NOTIFICATION_TYPE_LABEL = useNotificationTypeLabel();
  const REMINDER_LEAD_TIME_LABEL = useReminderLeadTimeLabel();
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    updateNotifications,
    undefined,
  );
  useActionToast(state, t("notificationsSavedToast"));
  const [current, setCurrent] = useState(prefs);
  const [leadTime, setLeadTime] = useState<ReminderLeadTime>(reminderLeadTime);

  function toggle(type: keyof NotificationPrefs, channel: "in_app" | "email") {
    setCurrent((prev) => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !prev[type][channel] },
    }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="notificationPrefs" value={JSON.stringify(current)} />
      <input type="hidden" name="reminderLeadTime" value={leadTime} />

      {/* Below md this is stacked cards, not a horizontally-scrolled table,
          per the Responsive rule against ever scrolling a data table. */}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border md:hidden">
        {NOTIFICATION_TYPES.map((type) => (
          <div key={type} className="flex flex-col gap-2 px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              {NOTIFICATION_TYPE_LABEL[type]}
            </span>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={current[type].in_app} onCheckedChange={() => toggle(type, "in_app")} />
                {t("inAppLabel")}
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={current[type].email} onCheckedChange={() => toggle(type, "email")} />
                {t("emailChannelLabel")}
              </label>
            </div>
          </div>
        ))}
      </div>

      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="text-start text-xs text-muted-foreground">
            <th className="pb-2 font-medium">{t("notifyMeAboutLabel")}</th>
            <th className="pb-2 ps-3 text-center font-medium">{t("inAppLabel")}</th>
            <th className="pb-2 ps-3 text-center font-medium">{t("emailChannelLabel")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {NOTIFICATION_TYPES.map((type) => (
            <tr key={type}>
              <td className="py-2.5 pe-3 text-foreground">{NOTIFICATION_TYPE_LABEL[type]}</td>
              <td className="py-2.5 ps-3 text-center">
                <Switch checked={current[type].in_app} onCheckedChange={() => toggle(type, "in_app")} />
              </td>
              <td className="py-2.5 ps-3 text-center">
                <Switch checked={current[type].email} onCheckedChange={() => toggle(type, "email")} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reminderLeadTimeSelect">{t("reminderLeadTimeLabel")}</Label>
          <Select value={leadTime} onValueChange={(next) => next && setLeadTime(next as ReminderLeadTime)}>
            <SelectTrigger id="reminderLeadTimeSelect" className="w-full">
              <SelectValue>{REMINDER_LEAD_TIME_LABEL[leadTime]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {REMINDER_LEAD_TIMES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REMINDER_LEAD_TIME_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quietHoursStart">{t("quietHoursStartLabel")}</Label>
          <Input
            id="quietHoursStart"
            name="quietHoursStart"
            type="time"
            defaultValue={quietHoursStart ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quietHoursEnd">{t("quietHoursEndLabel")}</Label>
          <Input id="quietHoursEnd" name="quietHoursEnd" type="time" defaultValue={quietHoursEnd ?? ""} />
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
