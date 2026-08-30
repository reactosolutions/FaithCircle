import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listEvents, listViewerCircles } from "@/features/events/queries";
import { ListView } from "@/features/events/components/list-view";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

// A flat, chronological list of every meeting across the viewer's circles —
// the counterpart to /events' month calendar. Upcoming first (ascending),
// then past (most recent first).
export default async function EventListPage() {
  const t = await getTranslations("Events");
  const circles = await listViewerCircles();

  if (circles.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("listPageTitle")} />
        <EmptyState icon="group" title={t("noCircleYet")} />
      </div>
    );
  }

  const events = await listEvents({ circleIds: circles.map((c) => c.id) });
  const nowIso = new Date().toISOString();
  const upcoming = events.filter((e) => e.starts_at >= nowIso);
  const past = events.filter((e) => e.starts_at < nowIso).reverse();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("listPageTitle")}
        action={
          <Button variant="outline" className="rounded-full" render={<Link href="/events" />}>
            <Icon name="calendar_month" size={16} />
            {t("calendarViewCta")}
          </Button>
        }
      />

      <section className="flex flex-col gap-2">
        <h2 className="border-s-2 border-accent ps-2 text-sm font-semibold text-muted-foreground">
          {t("upcomingHeading")}
        </h2>
        <ListView events={upcoming} circles={circles} />
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="border-s-2 border-accent ps-2 text-sm font-semibold text-muted-foreground">
            {t("pastHeading")}
          </h2>
          <ListView events={past} circles={circles} />
        </section>
      )}
    </div>
  );
}
