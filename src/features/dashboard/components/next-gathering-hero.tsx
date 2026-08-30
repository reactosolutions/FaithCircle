import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatEventDate, formatEventTime } from "@/features/events/format";
import { FormatBadge } from "@/features/events/components/format-badge";
import { HostVolunteerControl } from "@/features/events/components/host-volunteer-control";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";

interface EventLike {
  id: string;
  title: string;
  starts_at: string;
  format: "in_person" | "online" | "hybrid";
  host_id?: string | null;
}

// The one dominant hero element every dashboard page needs (per CLAUDE.md's
// hierarchy pass) — the single nearest upcoming meeting, visually larger
// than everything else on the page. Links through to the real event detail
// page for RSVP rather than duplicating that form here.
export function NextGatheringHero({ event }: { event: EventLike | null }) {
  const t = useTranslations("Dashboard");

  if (!event) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center shadow-sm">
        <IconCircle>
          <Icon name="event_busy" size={24} />
        </IconCircle>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">{t("heroNoEventTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("heroNoEventBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-accent md:p-8">
      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold tracking-wide text-accent-foreground uppercase">
          <Icon name="event" size={16} />
          {t("heroBadge")}
        </span>
        <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">{event.title}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Icon name="schedule" size={18} className="text-primary" />
            {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}
          </span>
          <FormatBadge format={event.format} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button className="rounded-full" render={<Link href={`/events/${event.id}`} />}>
            {t("heroCta")}
          </Button>
          {event.host_id == null && event.format !== "online" && (
            <HostVolunteerControl
              eventId={event.id}
              startsAt={event.starts_at}
              triggerVariant="ghost"
            />
          )}
        </div>
      </div>
    </div>
  );
}
