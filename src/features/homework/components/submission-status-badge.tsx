import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { SubmissionStatus } from "@/lib/database.types";

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus | null }) {
  const t = useTranslations("Homework");
  if (!status) {
    return (
      <Badge variant="outline">
        <Icon name="radio_button_unchecked" size={12} />
        {t("notStarted")}
      </Badge>
    );
  }

  const LABEL: Record<SubmissionStatus, string> = {
    draft: t("statusDraft"),
    submitted: t("statusSubmitted"),
    reviewed: t("statusReviewed"),
  };
  const VARIANT: Record<SubmissionStatus, "outline" | "secondary" | "default"> = {
    draft: "outline",
    submitted: "secondary",
    reviewed: "default",
  };
  // Status gets color AND an icon, consistently (CLAUDE.md hierarchy pass
  // rule 3) — the Badge variant already carries the color.
  const ICON: Record<SubmissionStatus, string> = {
    draft: "edit_note",
    submitted: "upload_file",
    reviewed: "check_circle",
  };

  return (
    <Badge variant={VARIANT[status]}>
      <Icon name={ICON[status]} size={12} />
      {LABEL[status]}
    </Badge>
  );
}
