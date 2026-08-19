"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { requestPasswordReset } from "@/features/auth/actions";
import { useActionToast } from "@/hooks/use-action-toast";
import { useOnActionSuccess } from "@/hooks/use-on-action-success";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COOLDOWN_SECONDS = 60;

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    requestPasswordReset,
    undefined,
  );
  useActionToast(state, t("resetLinkSentToast"));
  const [cooldown, setCooldown] = useState(0);
  useOnActionSuccess(state, () => setCooldown(COOLDOWN_SECONDS));

  // This effect is the legitimate case: subscribing to an external timer and
  // updating state from its callback, not synchronously in the effect body.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sent = state?.ok ?? false;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      {sent && (
        <p className="text-sm text-success">{t("resetLinkSentMessage")}</p>
      )}
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending || cooldown > 0} className="rounded-full">
        {pending
          ? t("sendingButton")
          : cooldown > 0
            ? t("resendInLabel", { seconds: cooldown })
            : sent
              ? t("resendEmailButton")
              : t("sendResetLinkButton")}
      </Button>
    </form>
  );
}
