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
