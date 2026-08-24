import { cn } from "@/lib/utils";

const TONE_CLASS = {
  muted: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  accent: "bg-accent/15 text-accent-foreground",
  info: "bg-info/10 text-info",
  warning: "bg-warning/15 text-warning",
} as const;

const SIZE_CLASS = {
  sm: "size-6",
  md: "size-10",
  lg: "size-12",
  xl: "size-14",
} as const;

// The recurring "icon (or initials) in a tinted circle" mark — empty
// states, error boundaries, toast icons, dashboard heroes, and the account
// avatar all drew this by hand with their own copy of the same four
// utility classes. One component, one place to keep it consistent instead
// of a dozen near-identical inline strings.
export function IconCircle({
  tone = "muted",
  size = "lg",
  className,
  children,
}: {
  tone?: keyof typeof TONE_CLASS;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
