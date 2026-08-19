import { cn } from "@/lib/utils";

// Hierarchy pass rule 4 (CLAUDE.md Design system): a mint hairline accent
// on the page title plus a subtle background wash behind it. Every
// top-level page was rendering a bare <h1> on a flat background — one
// shared wrapper instead of pasting the same treatment on every page.
export function PageHeader({
  title,
  description,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Extra control shown beside the title, e.g. a circle selector. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-accent/10 px-4 py-4 md:px-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="border-s-2 border-accent ps-3 font-heading text-2xl font-semibold text-foreground">
              {title}
            </h1>
            {description && <p className="ps-3 text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </div>
        {action}
      </div>
    </div>
  );
}
