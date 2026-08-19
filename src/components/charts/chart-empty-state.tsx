import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";

// "Every chart has ... an empty state with an icon rather than an empty
// axis" — per CLAUDE.md's Dashboards section.
export function ChartEmptyState({ icon = "bar_chart", message }: { icon?: string; message: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
      <IconCircle size="md">
        <Icon name={icon} size={20} />
      </IconCircle>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
