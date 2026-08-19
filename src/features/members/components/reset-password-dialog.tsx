"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { notifyActionResult } from "@/lib/notify";
import { resetMemberPassword } from "../actions";
import { TempPasswordPanel } from "./temp-password-panel";

// Admin-only (see resetMemberPassword's own comment) — the no-email
// equivalent of "forgot password" for someone locked out: generates a new
// temp password immediately and shows it once, same as InviteDialog.
export function ResetPasswordDialog({
  profileId,
  email,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange: onMobileOpenChangeProp,
}: {
  profileId: string;
  email: string;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("Members");
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = mobileOpenProp ?? internalMobileOpen;
  const onMobileOpenChange = onMobileOpenChangeProp ?? setInternalMobileOpen;
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function close() {
    onMobileOpenChange(false);
    setDesktopOpen(false);
    // Delayed so the confirm view doesn't flash back in before the dialog
    // has fully closed.
    setTimeout(() => setTempPassword(null), 200);
  }

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={onMobileOpenChange}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("resetPasswordTrigger")}
      triggerVariant="outline"
      triggerIcon="lock_reset"
      title={t("resetPasswordTitle")}
      description={tempPassword ? undefined : t("resetPasswordDescription")}
      hideMobileTrigger={mobileOpenProp !== undefined}
    >
      {tempPassword ? (
        <TempPasswordPanel email={email} tempPassword={tempPassword} onDone={close} />
      ) : (
        <Button
          type="button"
          disabled={pending}
          className="w-full rounded-full"
          onClick={() =>
            startTransition(async () => {
              const result = await resetMemberPassword({ profileId });
              if (result.ok && result.data) {
                setTempPassword(result.data.tempPassword);
              } else {
                notifyActionResult(result);
              }
            })
          }
        >
          {pending ? t("resettingButton") : t("resetPasswordConfirmButton")}
        </Button>
      )}
    </ResponsiveDialog>
  );
}
