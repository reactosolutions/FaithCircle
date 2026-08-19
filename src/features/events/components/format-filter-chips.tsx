"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { FORMAT_ICON_NAME, FORMAT_TEXT_CLASS } from "./format-badge";
import { useFormatLabel } from "../format";
import { Icon } from "@/components/ui/icon";
import type { EventFormat } from "@/lib/database.types";

const FORMATS: EventFormat[] = ["in_person", "online", "hybrid"];

export function FormatFilterChips({ current }: { current: EventFormat | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Events");
  const FORMAT_LABEL = useFormatLabel();

  function hrefFor(format: EventFormat | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (format) params.set("format", format);
    else params.delete("format");
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href={hrefFor(null)}
        className={cn(
          "min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          !current
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:bg-muted",
        )}
      >
        {t("allChip")}
      </Link>
      {FORMATS.map((format) => {
        const active = current === format;
        return (
          <Link
            key={format}
            href={hrefFor(active ? null : format)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? cn("border-current bg-muted", FORMAT_TEXT_CLASS[format])
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon name={FORMAT_ICON_NAME[format]} size={14} />
            {FORMAT_LABEL[format]}
          </Link>
        );
      })}
    </div>
  );
}
