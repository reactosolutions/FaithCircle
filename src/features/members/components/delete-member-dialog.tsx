"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { notifyActionResult } from "@/lib/notify";
import { deleteMember } from "../actions";

// Admin-only (members.delete). Unlike CancelInvitationDialog this is
// reachable for any member, not just a still-pending invite — the actual
// safety check (no attendance/homework/leadership history) happens
// server-side in deleteMember, so this dialog's only job is to make sure
// the admin meant it, and to surface the specific reason when it's blocked.
export function DeleteMemberDialog({
  profileId,
  memberName,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange: onMobileOpenChangeProp,
}: {
  profileId: string;
  memberName: string;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("Members");
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = mobileOpenProp ?? internalMobileOpen;
  const onMobileOpenChange = onMobileOpenChangeProp ?? setInternalMobileOpen;
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={onMobileOpenChange}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("deleteMemberTrigger")}
      triggerVariant="outline"
      triggerIcon="delete"
      title={t("deleteMemberTitle")}
      description={t("deleteMemberDescription", { name: memberName })}
      hideMobileTrigger={mobileOpenProp !== undefined}
    >
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        className="w-full rounded-full"
        onClick={() =>
          startTransition(async () => {
            const result = await deleteMember({ profileId });
            notifyActionResult(result, result.ok ? t("memberDeletedToast") : undefined);
            if (result.ok) {
              onMobileOpenChange(false);
              setDesktopOpen(false);
            }
          })
        }
      >
        {pending ? t("deletingButton") : t("deleteMemberConfirmButton")}
      </Button>
    </ResponsiveDialog>
  );
}
