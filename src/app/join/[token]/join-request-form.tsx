"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitJoinRequest } from "@/features/settings/organization/join-actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";

export function JoinRequestForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const action = submitJoinRequest.bind(null, token);
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    action,
    undefined,
  );
  useActionToast(state, t("requestSentToast"));

  if (state?.ok) {
    return <p className="text-sm text-success">{t("requestSentMessage")}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="rounded-full">
        {pending ? t("sendingButton") : t("requestToJoinButton")}
      </Button>
    </form>
  );
}
