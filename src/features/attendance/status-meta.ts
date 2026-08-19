import { useTranslations } from "next-intl";
import type { AttendanceStatus } from "@/lib/database.types";

// Attendance status is state, not series identity — every status wears the
// app's status tokens (success / warning / destructive) paired with an icon
// and a label, never color alone. Shared by the attendance sheet toggle and
// the member history chart so both stay in sync.
export function useAttendanceStatusMeta(): Record<
  AttendanceStatus,
  { label: string; iconName: string; solidClass: string }
> {
  const t = useTranslations("Attendance");
  return {
    present: {
      label: t("statusPresent"),
      iconName: "check",
      solidClass: "bg-success text-success-foreground",
    },
    excused: {
      label: t("statusExcused"),
      iconName: "schedule",
      solidClass: "bg-warning text-warning-foreground",
    },
    absent: {
      label: t("statusAbsent"),
      iconName: "close",
      solidClass: "bg-destructive text-destructive-foreground",
    },
  };
}
