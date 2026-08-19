"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useActionToast } from "@/hooks/use-action-toast";
import { useOnActionSuccess } from "@/hooks/use-on-action-success";
import { updateMemberProfile } from "../actions";
import type { ActionResult } from "@/lib/action-result";

export function EditMemberDialog({
  profileId,
  fullName,
  phone,
}: {
  profileId: string;
  fullName: string | null;
  phone: string | null;
}) {
  const t = useTranslations("Members");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    updateMemberProfile,
    undefined,
  );
  useActionToast(state, t("memberUpdatedToast"));
  useOnActionSuccess(state, () => {
    setMobileOpen(false);
    setDesktopOpen(false);
  });

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("editTrigger")}
      triggerVariant="outline"
      triggerIcon="edit"
      title={t("editTitle")}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="profileId" value={profileId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-fullName">{t("fullNameLabel")}</Label>
          <Input id="edit-fullName" name="fullName" defaultValue={fullName ?? ""} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-phone">{t("phoneLabel")}</Label>
          <PhoneInput id="edit-phone" name="phone" defaultValue={phone} />
        </div>
        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full rounded-full">
          {pending ? t("savingButton") : t("saveButton")}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
