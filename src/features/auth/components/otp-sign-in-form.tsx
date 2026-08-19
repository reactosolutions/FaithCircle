"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { requestSignInCode, verifySignInCode } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import { useOnActionSuccess } from "@/hooks/use-on-action-success";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// For someone who was invited or signed up but can't (or doesn't want to)
// click the email link — a 6-digit code proves the same thing (they own
// that inbox) without following a URL. Two steps in one component since the
// second step needs the email from the first.
export function OtpSignInForm({ onCancel }: { onCancel: () => void }) {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [requestState, requestAction, requestPending] = useActionState<ActionResult | undefined, FormData>(
    requestSignInCode,
    undefined,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState<ActionResult | undefined, FormData>(
    verifySignInCode,
    undefined,
  );
  useActionToast(requestState, t("otpCodeSentToast"));
  useOnActionSuccess(requestState, () => setCodeSent(true));

  if (!codeSent) {
    return (
      <form action={requestAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="otp-email">{t("emailLabel")}</Label>
          <Input
            id="otp-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {requestState && !requestState.ok && (
          <p role="alert" className="text-sm text-destructive">
            {requestState.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={requestPending} className="flex-1 rounded-full">
            {requestPending ? t("otpSendingButton") : t("otpSendCodeButton")}
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={onCancel}>
            {t("cancelButton")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />
      <p className="text-sm text-muted-foreground">
        {t("otpCodeSentToPrefix")} <span className="font-medium text-foreground">{email}</span>.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp-code">{t("codeLabel")}</Label>
        <Input
          id="otp-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
        />
      </div>
      {verifyState && !verifyState.ok && (
        <p role="alert" className="text-sm text-destructive">
          {verifyState.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={verifyPending} className="flex-1 rounded-full">
          {verifyPending ? t("otpVerifyingButton") : t("otpVerifyButton")}
        </Button>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => setCodeSent(false)}>
          {t("backButton")}
        </Button>
      </div>
    </form>
  );
}
