import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";

export function CanHostIndicator({ canHost }: { canHost: boolean }) {
  const t = useTranslations("Members");
  if (!canHost) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon name="home" size={14} />
      {t("canHost")}
    </span>
  );
}
