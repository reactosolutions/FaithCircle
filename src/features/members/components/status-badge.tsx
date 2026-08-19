import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { ProfileStatus } from "@/lib/database.types";

export function useStatusLabel(): Record<ProfileStatus, string> {
  const t = useTranslations("Members");
  return {
    invited: t("statusInvited"),
    active: t("statusActive"),
    inactive: t("statusInactive"),
    pending: t("statusPending"),
  };
}

const STATUS_VARIANT: Record<ProfileStatus, "default" | "outline" | "destructive"> = {
  active: "default",
  invited: "outline",
  inactive: "destructive",
  pending: "outline",
};

// Status gets color AND an icon, consistently (CLAUDE.md hierarchy pass
// rule 3) — the Badge variant already carries the color.
const STATUS_ICON: Record<ProfileStatus, string> = {
  active: "check_circle",
  invited: "mail",
  inactive: "block",
  pending: "hourglass_top",
};

export function StatusBadge({ status }: { status: ProfileStatus }) {
  const STATUS_LABEL = useStatusLabel();
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      <Icon name={STATUS_ICON[status]} size={12} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
