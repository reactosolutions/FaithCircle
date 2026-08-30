"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Caps a string at `max` characters and reveals the rest behind a
// "Show more" / "Show less" toggle. Character-based (not line-clamp) so it
// works without measuring layout — deterministic on the server and client.
export function CollapsibleText({
  text,
  max = 80,
  className,
  buttonClassName,
}: {
  text: string;
  max?: number;
  className?: string;
  buttonClassName?: string;
}) {
  const t = useTranslations("Common");
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > max;
  const shown = !isLong || expanded ? text : `${text.slice(0, max).trimEnd()}…`;

  return (
    <span className={className}>
      {shown}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "ms-1 align-baseline text-sm font-medium text-primary underline underline-offset-2",
            buttonClassName,
          )}
        >
          {expanded ? t("showLess") : t("showMore")}
        </button>
      )}
    </span>
  );
}
