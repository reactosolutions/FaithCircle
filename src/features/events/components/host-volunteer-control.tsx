"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { claimEventHost, releaseEventHost } from "../actions";
import { formatEventDayDate } from "../format";
import { notifyActionResult } from "@/lib/notify";

// Host management for one meeting, from the event page's host card and the
// dashboard shortcut:
//   - you're the host        -> "Step down as host"
//   - no host yet            -> "I'll host" (confirm step naming the date)
//   - someone else hosts +
//     you can edit the event -> "Remove host" (admin / circle leader only)
//   - someone else hosts +
//     you can't              -> nothing
export function HostVolunteerControl({
  eventId,
  startsAt,
  isCurrentHost = false,
  hasOtherHost = false,
  canManageHost = false,
  triggerVariant = "outline",
  triggerClassName,
}: {
  eventId: string;
  startsAt: string;
  isCurrentHost?: boolean;
  hasOtherHost?: boolean;
  canManageHost?: boolean;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
}) {
  const t = useTranslations("Events");
  const [pending, startTransition] = useTransition();

  // Both "step down" (you're the host) and "remove host" (an editor
  // clearing someone else's) call releaseEventHost — same button, only the
  // label and toast differ.
  if (isCurrentHost || hasOtherHost) {
    if (hasOtherHost && !canManageHost) return null;
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        className={triggerClassName}
        onClick={() =>
          startTransition(async () => {
            const result = await releaseEventHost({ eventId });
            notifyActionResult(result, isCurrentHost ? t("hostReleasedToast") : t("hostRemovedToast"));
          })
        }
      >
        {isCurrentHost ? t("stepDownAsHost") : t("removeHost")}
      </Button>
    );
  }

  return (
    <ConfirmDialog
      triggerLabel={t("volunteerToHost")}
      triggerVariant={triggerVariant}
      triggerClassName={triggerClassName}
      title={t("hostConfirmTitle")}
      description={t("hostConfirmBody", { date: formatEventDayDate(startsAt) })}
      body={<p className="text-sm text-muted-foreground">{t("hostConfirmDetail")}</p>}
      confirmLabel={t("hostConfirmYes")}
      pendingLabel={t("saving")}
      successToast={t("hostClaimedToast")}
      onConfirm={() => claimEventHost({ eventId })}
    />
  );
}
