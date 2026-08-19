import { useTranslations } from "next-intl";
import type { AttendMode, AttendanceStatus, RsvpResponse } from "@/lib/database.types";

export interface SheetMember {
  id: string;
  fullName: string | null;
  attendance: { status: AttendanceStatus; note: string | null; mode: AttendMode | null } | null;
  rsvpResponse: RsvpResponse;
  rsvpAttendMode: AttendMode | null;
}

export interface RowState {
  status: AttendanceStatus | null;
  note: string;
  mode: AttendMode | null;
}

export function useModeOptions(): { value: AttendMode; label: string }[] {
  const t = useTranslations("Attendance");
  return [
    { value: "in_person", label: t("modeInPerson") },
    { value: "online", label: t("modeOnline") },
  ];
}

export function useGroupLabel() {
  const t = useTranslations("Attendance");
  return (key: "in_person" | "online" | "other") => {
    if (key === "in_person") return t("expectedInPerson");
    if (key === "online") return t("expectedOnline");
    return t("noRsvp");
  };
}
