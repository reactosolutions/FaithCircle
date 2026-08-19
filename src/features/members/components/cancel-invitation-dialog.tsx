"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { notifyActionResult } from "@/lib/notify";
import { cancelInvitation } from "../actions";

// Admin-only, and only ever shown for status='invited' (see
// cancelInvitation's own comment on why it's restricted there) — this
// deletes the account outright rather than deactivating it, since it never
// became a real member.
export function CancelInvitationDialog({
  profileId,
  memberName,
}: {
  profileId: string;
  memberName: string;
}) {
  const t = useTranslations("Members");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("cancelInvitationTrigger")}
      triggerVariant="outline"
      triggerIcon="person_remove"
      title={t("cancelInvitationTitle")}
      description={t("cancelInvitationDescription", { name: memberName })}
    >
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        className="w-full rounded-full"
        onClick={() =>
          startTransition(async () => {
            const result = await cancelInvitation({ profileId });
            notifyActionResult(result, result.ok ? t("invitationCancelledToast") : undefined);
            if (result.ok) {
              setMobileOpen(false);
              setDesktopOpen(false);
            }
          })
        }
      >
        {pending ? t("cancellingButton") : t("cancelInvitationConfirmButton")}
      </Button>
    </ResponsiveDialog>
  );
}
