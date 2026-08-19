import { cn } from "@/lib/utils";

// Material Symbols Outlined — the font is linked once in the root layout;
// this renders the ligature (the icon's name, e.g. "home", "event") as the
// span's text content, which the variable font substitutes with the glyph.
// `filled` sets the FILL axis to 1 (the solid/active variant Material
// Symbols supports natively) instead of swapping to a different icon —
// used for the active state of nav items.
export function Icon({
  name,
  className,
  size = 24,
  filled = false,
  weight = 400,
}: {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
  weight?: 300 | 400 | 500 | 600 | 700;
}) {
  return (
    <span
      className={cn("material-symbols-outlined inline-block shrink-0 leading-none select-none", className)}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
