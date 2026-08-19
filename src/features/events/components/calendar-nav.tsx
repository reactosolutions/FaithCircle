"use client";

import { addDays, addMonths, addWeeks, format } from "date-fns";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function CalendarNav({
  anchor,
  view,
  label,
  hijriLabel,
}: {
  anchor: Date;
  view: "month" | "week" | "day";
  label: string;
  hijriLabel?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Events");

  const go = (next: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(next, "yyyy-MM-dd"));
    router.push(`${pathname}?${params.toString()}`);
  };

  const step = view === "month" ? addMonths : view === "week" ? addWeeks : addDays;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="rounded-full"
        onClick={() => go(step(anchor, -1))}
      >
        <Icon name="chevron_left" size={18} data-icon="inline-start" />
      </Button>
      <span className="flex min-w-32 flex-col items-center text-center">
        <span className="text-sm font-medium">{label}</span>
        {hijriLabel && <span className="text-xs text-muted-foreground">{hijriLabel}</span>}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="rounded-full"
        onClick={() => go(step(anchor, 1))}
      >
        <Icon name="chevron_right" size={18} data-icon="inline-end" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full"
        onClick={() => go(new Date())}
      >
        {t("today")}
      </Button>
    </div>
  );
}
