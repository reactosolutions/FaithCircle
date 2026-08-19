"use client";

import { useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { markNotificationRead } from "../actions";
import { formatNotification } from "../format";
import { notifyActionResult } from "@/lib/notify";
import type { Database } from "@/lib/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export function NotificationRow({ row }: { row: NotificationRow }) {
  const [, startTransition] = useTransition();
  const { text, href } = formatNotification(row);
  const unread = !row.read_at;

  function markRead() {
    if (!unread) return;
    startTransition(async () => {
      const result = await markNotificationRead(row.id);
      // Clicking a notification navigates away immediately, so only a
      // failure (read state didn't actually update) is worth a toast.
      notifyActionResult(result);
    });
  }

  const content = (
    <div
      className={cn(
        "flex min-h-11 items-start gap-3 px-4 py-3",
        unread && "bg-primary/5",
      )}
    >
      <span
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm text-foreground">{text}</span>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} onClick={markRead} className="block hover:bg-muted/50">
      {content}
    </Link>
  );
}
