import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatEventDate, formatEventTime } from "@/features/events/format";
import { FORMAT_ICON_NAME } from "@/features/events/components/format-badge";
import { Icon } from "@/components/ui/icon";
import type { EventFormat } from "@/lib/database.types";

interface EventLike {
  id: string;
  title: string;
  starts_at: string;
  format: EventFormat;
}

export function UpcomingEventsList({ events }: { events: EventLike[] }) {
  const t = useTranslations("Dashboard");

  if (events.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{t("eventsNone")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {events.map((event) => {
        return (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50"
          >
            <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
              <Icon name={FORMAT_ICON_NAME[event.format]} size={14} className="shrink-0 text-muted-foreground" />
              <span className="truncate">{event.title}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
