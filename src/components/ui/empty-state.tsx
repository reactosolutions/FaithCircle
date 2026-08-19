import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";
import { cn } from "@/lib/utils";

// "No page may show bare 'No data' text" — a page/section-level empty
// state gets a 48px icon in a tinted circle, a one-line explanation, and
// an optional primary action. Dense, nested empty states (a row inside an
// already-populated list, a picker with no options) stay plain text —
// this is for the "this whole page/section has nothing" case.
export function EmptyState({
  icon,
  title,
  action,
  className,
}: {
  icon: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <IconCircle>
        <Icon name={icon} size={24} />
      </IconCircle>
      <p className="text-sm text-muted-foreground">{title}</p>
      {action}
    </div>
  );
}
