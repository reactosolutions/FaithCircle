import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getUnreadNotificationCount } from "@/features/notifications/queries";
import { Icon } from "@/components/ui/icon";

export async function NotificationBell() {
  const [unreadCount, t] = await Promise.all([getUnreadNotificationCount(), getTranslations("Nav")]);

  return (
    <Link
      href="/notifications"
      aria-label={unreadCount > 0 ? t("notificationsUnread", { count: unreadCount }) : t("notifications")}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted md:size-8"
    >
      <Icon name="notifications" size={20} className="text-foreground" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 end-1.5 flex size-2 rounded-full bg-destructive md:top-1 md:end-1" />
      )}
    </Link>
  );
}

// Streamed-in via Suspense (see AppHeader) — the unread count is an extra
// Postgres round trip unrelated to the page's own content, and every single
// navigation in the app was blocking on it before the rest of the page
// could paint. This renders instantly (no unread dot, same dimensions) and
// the real bell swaps in once the count resolves.
export function NotificationBellFallback({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full md:size-8"
    >
      <Icon name="notifications" size={20} className="text-foreground" />
    </span>
  );
}
