import { useTranslations } from "next-intl";
import type { EventAudience, EventFormat, EventRecurrence } from "@/lib/database.types";

export function useRecurrenceLabel(): Record<EventRecurrence, string> {
  const t = useTranslations("Events");
  return {
    none: t("recurrenceNone"),
    weekly: t("recurrenceWeekly"),
    biweekly: t("recurrenceBiweekly"),
    monthly: t("recurrenceMonthly"),
  };
}

export function useDurations(): { value: string; label: string }[] {
  const t = useTranslations("Events");
  return [
    { value: "60", label: t("duration1h") },
    { value: "90", label: t("duration1_5h") },
    { value: "120", label: t("duration2h") },
  ];
}

export function useFormatOptions(): { value: EventFormat; label: string }[] {
  const t = useTranslations("Events");
  return [
    { value: "in_person", label: t("formatInPerson") },
    { value: "online", label: t("formatOnline") },
    { value: "hybrid", label: t("formatHybrid") },
  ];
}

export function useAudienceOptions(): { value: EventAudience; label: string }[] {
  const t = useTranslations("Events");
  return [
    { value: "circle", label: t("audienceCircleOnly") },
    { value: "multi_circle", label: t("audienceMultiCircle") },
    { value: "custom", label: t("audienceCustom") },
  ];
}

export interface SchedulableCircle {
  id: string;
  name: string;
}

export interface HostCandidate {
  id: string;
  full_name: string | null;
  home_address: string | null;
  host_capacity: number | null;
}

export interface OtherCircle {
  id: string;
  name: string;
  memberCount: number;
}

export interface InviteCandidate {
  id: string;
  full_name: string | null;
  email: string | null;
}
