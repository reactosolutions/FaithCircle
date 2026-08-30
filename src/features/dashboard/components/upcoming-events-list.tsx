import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatEventDate, formatEventTime } from "@/features/events/format";
import { FORMAT_ICON_NAME } from "@/features/events/components/format-badge";
import { HostVolunteerControl } from "@/features/events/components/host-volunteer-control";
import { Icon } from "@/components/ui/icon";
import { StaggerItem } from "@/components/ui/stagger-item";
import type { EventFormat } from "@/lib/database.types";

interface EventLike {
  id: string;
  title: string;
  starts_at: string;
  format: EventFormat;
  host_id?: string | null;
}

export function UpcomingEventsList({ events }: { events: EventLike[] }) {
  const t = useTranslations("Dashboard");

  if (events.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{t("eventsNone")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {events.map((event, index) => {
        // A one-tap "I'll host" shortcut, only for meetings that still need
        // a host and can actually have one (online meetings can't). Kept
        // outside the row's <Link> so it isn't a nested interactive.
        const showHostShortcut = event.host_id == null && event.format !== "online";
        return (
          <StaggerItem key={event.id} index={index}>
            <div className="flex min-h-11 items-center gap-2 pe-3 hover:bg-muted/50">
              <Link
                href={`/events/${event.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                  <Icon name={FORMAT_ICON_NAME[event.format]} size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{event.title}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}
                </span>
              </Link>
              {showHostShortcut && (
                <HostVolunteerControl
                  eventId={event.id}
                  startsAt={event.starts_at}
                  triggerVariant="ghost"
                  triggerClassName="h-7 shrink-0 px-2 text-xs"
                />
              )}
            </div>
          </StaggerItem>
        );
      })}
    </div>
  );
}
