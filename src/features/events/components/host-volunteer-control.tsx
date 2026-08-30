"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (isCurrentHost) {
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
            notifyActionResult(result, t("hostReleasedToast"));
          })
        }
      >
        {t("stepDownAsHost")}
      </Button>
    );
  }

  if (hasOtherHost) {
    if (!canManageHost) return null;
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
            notifyActionResult(result, t("hostRemovedToast"));
          })
        }
      >
        {t("removeHost")}
      </Button>
    );
  }

  function confirm() {
    startTransition(async () => {
      const result = await claimEventHost({ eventId });
      notifyActionResult(result, t("hostClaimedToast"));
      if (result.ok) {
        setMobileOpen(false);
        setDesktopOpen(false);
      }
    });
  }

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("volunteerToHost")}
      triggerVariant={triggerVariant}
      triggerClassName={triggerClassName}
      title={t("hostConfirmTitle")}
      description={t("hostConfirmBody", { date: formatEventDayDate(startsAt) })}
    >
      <p className="text-sm text-muted-foreground">{t("hostConfirmDetail")}</p>
      <Button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="w-full rounded-full"
      >
        {pending ? t("saving") : t("hostConfirmYes")}
      </Button>
    </ResponsiveDialog>
  );
}
