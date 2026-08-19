"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { requestDeactivation } from "../actions";
import { notifyActionResult } from "@/lib/notify";

export function DangerZone() {
  const t = useTranslations("Settings");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 p-4">
      <p className="text-sm font-medium text-foreground">{t("deactivateTitle")}</p>
      <p className="text-sm text-muted-foreground">{t("deactivateDescription")}</p>
      {sent ? (
        <p className="text-sm text-success">{t("requestSentMessage")}</p>
      ) : (
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          className="w-fit rounded-full"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await requestDeactivation();
              if (result.ok) setSent(true);
              else setError(result.error);
              notifyActionResult(result, t("deactivationRequestToast"));
            });
          }}
        >
          {pending ? t("sendingButton") : t("requestDeactivationButton")}
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
