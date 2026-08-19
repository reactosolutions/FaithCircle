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
  DATE_FORMATS,
  LANGUAGES,
  LANGUAGE_LABEL,
  THEMES,
  useThemeLabel,
  useWeekdays,
} from "../schema";
import { updatePreferences } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import type { LanguagePreference, ThemePreference } from "@/lib/database.types";

export function PreferencesForm({
  language,
  theme,
  timezone,
  dateFormat,
  weekStartsOn,
  showHijriDates,
}: {
  language: LanguagePreference;
  theme: ThemePreference;
  timezone: string;
  dateFormat: string;
  weekStartsOn: number;
  showHijriDates: boolean;
}) {
  const t = useTranslations("Settings");
  const THEME_LABEL = useThemeLabel();
  const WEEKDAYS = useWeekdays();
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    updatePreferences,
    undefined,
  );
  useActionToast(state, t("preferencesSavedToast"));
  const [lang, setLang] = useState<LanguagePreference>(language);
  const [themeValue, setThemeValue] = useState<ThemePreference>(theme);
  const [weekStart, setWeekStart] = useState(String(weekStartsOn));
  const [format, setFormat] = useState(dateFormat);
  const [hijri, setHijri] = useState(showHijriDates);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="language" value={lang} />
      <input type="hidden" name="theme" value={themeValue} />
      <input type="hidden" name="weekStartsOn" value={weekStart} />
      <input type="hidden" name="dateFormat" value={format} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="languageSelect">{t("languageLabel")}</Label>
          <Select value={lang} onValueChange={(next) => next && setLang(next as LanguagePreference)}>
            <SelectTrigger id="languageSelect" className="w-full">
              <SelectValue>{LANGUAGE_LABEL[lang]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((value) => (
                <SelectItem key={value} value={value}>
                  {LANGUAGE_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="themeSelect">{t("themeLabel")}</Label>
          <Select value={themeValue} onValueChange={(next) => next && setThemeValue(next as ThemePreference)}>
            <SelectTrigger id="themeSelect" className="w-full">
              <SelectValue>{THEME_LABEL[themeValue]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {THEMES.map((value) => (
                <SelectItem key={value} value={value}>
                  {THEME_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timezone">{t("timezoneLabel")}</Label>
          <Input id="timezone" name="timezone" defaultValue={timezone} placeholder="Asia/Riyadh" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateFormatSelect">{t("dateFormatLabel")}</Label>
          <Select value={format} onValueChange={(next) => next && setFormat(next)}>
            <SelectTrigger id="dateFormatSelect" className="w-full">
              <SelectValue>{format}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="weekStartSelect">{t("weekStartLabel")}</Label>
          <Select value={weekStart} onValueChange={(next) => next && setWeekStart(next)}>
            <SelectTrigger id="weekStartSelect" className="w-full">
              <SelectValue>{WEEKDAYS.find((d) => d.value === weekStart)?.label}</SelectValue>
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
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="showHijriDates">{t("showHijriLabel")}</Label>
          <span className="text-xs text-muted-foreground">{t("showHijriHint")}</span>
        </div>
        <Switch
          id="showHijriDates"
          name="showHijriDates"
          checked={hijri}
          onCheckedChange={setHijri}
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-success">{t("preferencesSavedHint")}</p>}

      <Button type="submit" disabled={pending} className="w-fit rounded-full">
        {pending ? t("savingButton") : t("saveButton")}
      </Button>
    </form>
  );
}
