"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "card";

// Desktop-only affordance (callers render it inside a `hidden md:flex`
// wrapper) — below md the responsive rule already forces a single compact
// layout per row, so there's nothing to toggle.
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  const t = useTranslations("Common");

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5">
      <button
        type="button"
        aria-label={t("listViewLabel")}
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          value === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
        )}
      >
        <Icon name="view_list" size={18} />
      </button>
      <button
        type="button"
        aria-label={t("cardViewLabel")}
        aria-pressed={value === "card"}
        onClick={() => onChange("card")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          value === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
        )}
      >
        <Icon name="grid_view" size={18} />
      </button>
    </div>
  );
}
