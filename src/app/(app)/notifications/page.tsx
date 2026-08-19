import { listNotifications } from "@/features/notifications/queries";
import { NotificationRow } from "@/features/notifications/components/notification-row";
import { MarkAllReadButton } from "@/features/notifications/components/mark-all-read-button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { StaggerItem } from "@/components/ui/stagger-item";

export default async function NotificationsPage() {
  const notifications = await listNotifications();
  const hasUnread = notifications.some((row) => !row.read_at);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title="Notifications" action={hasUnread && <MarkAllReadButton />} />

      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {notifications.length === 0 && (
            <EmptyState icon="notifications_off" title="You're all caught up." />
          )}
          {notifications.map((row, index) => (
            <StaggerItem key={row.id} index={index}>
              <NotificationRow row={row} />
            </StaggerItem>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
