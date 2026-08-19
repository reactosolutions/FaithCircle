"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Common");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <IconCircle tone="destructive">
        <Icon name="cloud_off" size={24} />
      </IconCircle>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{t("errorTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("errorSubtitle")}</p>
      </div>
      <Button onClick={reset} size="sm">
        {t("tryAgainButton")}
      </Button>
    </div>
  );
}
