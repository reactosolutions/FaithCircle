"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { updateAccount } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";

export function AccountForm({
  fullName,
  phone,
}: {
  fullName: string | null;
  phone: string | null;
}) {
  const t = useTranslations("Settings");
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    updateAccount,
    undefined,
  );
  useActionToast(state, t("accountUpdatedToast"));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
        <Input id="fullName" name="fullName" defaultValue={fullName ?? ""} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">{t("phoneLabel")}</Label>
        <PhoneInput id="phone" name="phone" defaultValue={phone} />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-success">{t("savedMessage")}</p>}
      <Button type="submit" disabled={pending} className="w-fit rounded-full">
        {pending ? t("savingButton") : t("saveButton")}
      </Button>
    </form>
  );
}
