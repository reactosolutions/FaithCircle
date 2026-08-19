import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useFormatLabel } from "../format";
import type { EventFormat } from "@/lib/database.types";

// One consistent icon + accent color per format, reused across the
// calendar pills/left-borders, the filter chips, and the event detail
// header badge — a single source of truth instead of three ad-hoc pickers.
export const FORMAT_ICON_NAME: Record<EventFormat, string> = {
  in_person: "location_on",
  online: "videocam",
  hybrid: "layers",
};

export const FORMAT_BORDER_CLASS: Record<EventFormat, string> = {
  in_person: "border-s-primary",
  online: "border-s-info",
  hybrid: "border-s-foreground/50",
};

// online=indigo, in-person=teal — the status-color pairing CLAUDE.md's
// Motion section requires (distinct from accent/gold, which is reserved
// for highlights, not a format's identity color).
export const FORMAT_TEXT_CLASS: Record<EventFormat, string> = {
  in_person: "text-primary",
  online: "text-info",
  hybrid: "text-foreground",
};

export function FormatBadge({ format, className }: { format: EventFormat; className?: string }) {
  const FORMAT_LABEL = useFormatLabel();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium",
        FORMAT_TEXT_CLASS[format],
        className,
      )}
    >
      <Icon name={FORMAT_ICON_NAME[format]} size={14} />
      {FORMAT_LABEL[format]}
    </span>
  );
}
