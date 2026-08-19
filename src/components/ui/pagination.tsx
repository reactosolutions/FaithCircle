import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Server-renderable (plain <Link>s, no client JS needed) — builds each
// page's href by cloning the current searchParams and swapping `page`, so
// it composes with whatever other filters a caller already has in the URL.
export function Pagination({
  page,
  pageCount,
  basePath,
  searchParams,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  function hrefFor(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    if (target > 1) {
      params.set("page", String(target));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-full",
          page <= 1 && "pointer-events-none opacity-50",
        )}
      >
        <Icon name="chevron_left" size={16} data-icon="inline-start" />
        Previous
      </Link>
      <span className="text-sm text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={page >= pageCount}
        tabIndex={page >= pageCount ? -1 : undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-full",
          page >= pageCount && "pointer-events-none opacity-50",
        )}
      >
        Next
        <Icon name="chevron_right" size={16} data-icon="inline-end" />
      </Link>
    </nav>
  );
}
