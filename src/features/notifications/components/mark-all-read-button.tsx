"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "../actions";
import { notifyActionResult } from "@/lib/notify";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsRead();
          notifyActionResult(result, "All notifications marked as read.");
        })
      }
    >
      {pending ? "Marking…" : "Mark all as read"}
    </Button>
  );
}
