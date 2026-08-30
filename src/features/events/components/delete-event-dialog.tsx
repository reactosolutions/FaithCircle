"use client";

import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteEvent } from "../actions";

// deleteEvent() redirects to /events on success, so ConfirmDialog's toast /
// close path only runs on failure — which is the intended behaviour here.
export function DeleteEventDialog({
  eventId,
  isRecurring,
}: {
  eventId: string;
  isRecurring: boolean;
}) {
  const t = useTranslations("Events");
  return (
    <ConfirmDialog
      triggerLabel={t("deleteTrigger")}
      triggerIcon="delete"
      title={t("deleteTitle")}
      description={isRecurring ? t("deleteBodyRecurring") : t("deleteBody")}
      confirmLabel={t("deleteConfirm")}
      confirmVariant="destructive"
      pendingLabel={t("saving")}
      onConfirm={() => deleteEvent({ eventId })}
    />
  );
}
