"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { claimEventHost, releaseEventHost } from "../actions";
import { formatEventDayDate } from "../format";
import { notifyActionResult } from "@/lib/notify";

// The self-service "I'll host" affordance — a resolved member volunteering
// themselves as host of a meeting, gated behind a confirm step that names
// the exact date. Reused on the event detail page's host card and on the
// dashboard's upcoming-meetings shortcut. When the viewer is already the
// host it collapses to a plain "step down" button (no confirm needed).
export function HostVolunteerControl({
  eventId,
  startsAt,
  isCurrentHost = false,
  triggerVariant = "outline",
  triggerClassName,
}: {
  eventId: string;
  startsAt: string;
  isCurrentHost?: boolean;
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
