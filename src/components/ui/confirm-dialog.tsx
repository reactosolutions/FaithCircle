"use client";

import { useState, useTransition } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { notifyActionResult } from "@/lib/notify";
import type { ActionResult } from "@/lib/action-result";

// Trigger → dialog with an optional body → one confirming button that runs
// `onConfirm` (a Server Action returning ActionResult), surfaces the result
// via toast, and closes on success. The shared shape behind the several
// confirm-then-act dialogs in the app (delete event, claim host, …).
export function ConfirmDialog({
  triggerLabel,
  triggerIcon,
  triggerVariant = "outline",
  triggerClassName,
  title,
  description,
  body,
  confirmLabel,
  confirmVariant = "default",
  pendingLabel,
  successToast,
  onConfirm,
}: {
  triggerLabel: string;
  triggerIcon?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
  title: string;
  description?: string;
  body?: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  pendingLabel: string;
  successToast?: string;
  onConfirm: () => Promise<ActionResult>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      notifyActionResult(result, successToast);
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
      triggerLabel={triggerLabel}
      triggerIcon={triggerIcon}
      triggerVariant={triggerVariant}
      triggerClassName={triggerClassName}
      title={title}
      description={description}
    >
      {body}
      <Button
        type="button"
        variant={confirmVariant}
        onClick={confirm}
        disabled={pending}
        className="w-full rounded-full"
      >
        {pending ? pendingLabel : confirmLabel}
      </Button>
    </ResponsiveDialog>
  );
}
