"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { signInWithPassword } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/components/password-input";
import { OtpSignInForm } from "@/features/auth/components/otp-sign-in-form";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    signInWithPassword,
    undefined,
  );
  useActionToast(state, t("signedInToast"));
  const [useCode, setUseCode] = useState(false);

  if (useCode) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">{t("otpTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("otpSubtitle")}</p>
        </div>
        <OtpSignInForm onCancel={() => setUseCode(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary underline">
              {t("forgotPasswordLink")}
            </Link>
          </div>
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </div>
        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="rounded-full">
          {pending ? t("signingInButton") : t("signInButton")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccountText")}{" "}
        <Link href="/signup" className="font-medium text-primary underline">
          {t("signUpLink")}
        </Link>
      </p>

      <button
        type="button"
        onClick={() => setUseCode(true)}
        className="text-center text-xs font-medium text-primary underline"
      >
        {t("otpToggleLink")}
      </button>
    </div>
  );
}
