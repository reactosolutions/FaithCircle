"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { signUp, resendConfirmationEmail } from "../actions";
import { PasswordInput } from "./password-input";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { useActionToast } from "@/hooks/use-action-toast";
import { useOnActionSuccess } from "@/hooks/use-on-action-success";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";

const RESEND_COOLDOWN_SECONDS = 60;

function ResendButton({ email }: { email: string }) {
  const t = useTranslations("Signup");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        disabled={secondsLeft > 0 || pending}
        onClick={async () => {
          setPending(true);
          setSent(false);
          await resendConfirmationEmail(email);
          setPending(false);
          setSent(true);
          setSecondsLeft(RESEND_COOLDOWN_SECONDS);
        }}
      >
        {pending
          ? t("resendButtonPending")
          : secondsLeft > 0
            ? t("resendCooldown", { seconds: secondsLeft })
            : t("resendButton")}
      </Button>
      {sent && secondsLeft === RESEND_COOLDOWN_SECONDS && (
        <span className="text-xs text-success">{t("resendSent")}</span>
      )}
    </div>
  );
}

export function SignupForm() {
  const t = useTranslations("Signup");
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    signUp,
    undefined,
  );
  useActionToast(state, "Account created.");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  useOnActionSuccess(state, () => setSubmittedEmail(email));

  if (submittedEmail) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {t("checkEmailTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("checkEmailBody", { email: submittedEmail })}
        </p>
        <ResendButton email={submittedEmail} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t("passwordLabel")}</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordStrengthMeter password={password} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
          <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t("phoneLabel")}</Label>
          <PhoneInput id="phone" name="phone" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inviteCode">{t("inviteCodeLabel")}</Label>
          <Input id="inviteCode" name="inviteCode" />
        </div>

        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="rounded-full">
          {pending ? t("submitButtonPending") : t("submitButton")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-primary underline">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
