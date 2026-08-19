"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/features/auth/components/password-input";
import { PasswordStrengthMeter } from "@/features/auth/components/password-strength-meter";
import { changePassword } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations("Settings");
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    changePassword,
    undefined,
  );
  useActionToast(state, t("passwordUpdatedToast"));
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {hasPassword && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currentPassword">{t("currentPasswordLabel")}</Label>
          <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{hasPassword ? t("newPasswordLabel") : t("setPasswordLabel")}</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordStrengthMeter password={password} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-success">{t("passwordUpdatedToast")}</p>}
      <Button type="submit" disabled={pending} className="w-fit rounded-full">
        {pending ? t("savingButton") : hasPassword ? t("updatePasswordButton") : t("setPasswordButton")}
      </Button>
    </form>
  );
}
