"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Week is a desktop-only tab and Day is mobile-only — the spec calls for
// hiding Week below md in favor of Day, not offering both everywhere. Pure
// CSS visibility per tab, not a JS viewport check: both exist in the DOM,
// only one is ever clickable per breakpoint. A view reached directly via
// URL (e.g. a shared link) still renders even if its tab is hidden.
const VIEWS = [
  { value: "month", labelKey: "viewMonth", visibility: "" },
  { value: "week", labelKey: "viewWeek", visibility: "hidden md:inline-flex" },
  { value: "day", labelKey: "viewDay", visibility: "md:hidden" },
  { value: "list", labelKey: "viewList", visibility: "" },
] as const;

export function ViewSwitcher({ current }: { current: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Events");

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border p-1">
      {VIEWS.map((view) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", view.value);
        return (
          <Link
            key={view.value}
            href={`${pathname}?${params.toString()}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              view.visibility,
              current === view.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t(view.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
