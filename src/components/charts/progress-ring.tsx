"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion, animate } from "motion/react";
import { cn } from "@/lib/utils";

// Circular progress ring — animates 0→value once on mount (never on
// refetch, since this only runs its effect once per mount) and collapses
// to an instant opacity-only reveal under prefers-reduced-motion, per
// CLAUDE.md's Motion section.
export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 3,
  className,
  trackClassName = "text-muted",
  fillClassName = "text-primary",
  label = true,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  // Defaults to the live animated percentage — pass `false` to hide it
  // entirely (e.g. when a caller renders its own label alongside the ring).
  label?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [dash, setDash] = useState(reduceMotion ? value : 0);
  const ref = useRef<SVGCircleElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // The initial useState value above already accounts for reduced
    // motion — nothing to animate, so nothing to set here.
    if (reduceMotion) return;
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDash(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate only on mount, per the Motion section's "once on mount, never on refetch" rule
  }, []);

  const offset = circumference - (dash / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          ref={ref}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={fillClassName}
        />
      </svg>
      {label && (
        <span className="absolute font-heading text-sm font-semibold text-foreground">
          {Math.round(dash)}%
        </span>
      )}
    </div>
  );
}
