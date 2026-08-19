"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "todo", labelKey: "tabTodo" },
  { value: "submitted", labelKey: "tabSubmitted" },
  { value: "reviewed", labelKey: "tabReviewed" },
  { value: "all", labelKey: "tabAll" },
] as const;

export function HomeworkTabs({ current }: { current: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Homework");

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border p-1">
      {TABS.map((tab) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab.value);
        return (
          <Link
            key={tab.value}
            href={`${pathname}?${params.toString()}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              current === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
