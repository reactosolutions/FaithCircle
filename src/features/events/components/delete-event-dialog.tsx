"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "../actions";
import { notifyActionResult } from "@/lib/notify";

// Confirm-then-delete for a meeting. deleteEvent() redirects to /events on
// success, so there's no success toast to wait for here.
export function DeleteEventDialog({
  eventId,
  isRecurring,
}: {
  eventId: string;
  isRecurring: boolean;
}) {
  const t = useTranslations("Events");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteEvent({ eventId });
      // Only reached on failure — success navigates away.
      notifyActionResult(result);
    });
  }

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("deleteTrigger")}
      triggerIcon="delete"
      triggerVariant="outline"
      title={t("deleteTitle")}
      description={isRecurring ? t("deleteBodyRecurring") : t("deleteBody")}
    >
      <Button
        type="button"
        variant="destructive"
        onClick={confirm}
        disabled={pending}
        className="w-full rounded-full"
      >
        {pending ? t("saving") : t("deleteConfirm")}
      </Button>
    </ResponsiveDialog>
  );
}
