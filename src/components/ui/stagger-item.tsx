"use client";

import { motion, useReducedMotion } from "motion/react";

const MAX_STAGGERED_INDEX = 8;
const STAGGER_STEP_SECONDS = 0.03;
const ENTER_DURATION_SECONDS = 0.2;

// List items stagger in at 30ms intervals, max 8 items staggered, the rest
// appear instantly — per CLAUDE.md's Motion section. Wrap each row of a
// list's .map() with this instead of rendering the row directly. Motion is
// opacity + a small vertical offset only (never x, so nothing to mirror
// under RTL; never a layout property), and collapses to an instant,
// unanimated render under prefers-reduced-motion.
export function StaggerItem({
  index,
  as = "div",
  children,
  className,
}: {
  index: number;
  as?: "div" | "tr";
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const Static = as;

  if (reduceMotion || index >= MAX_STAGGERED_INDEX) {
    return <Static className={className}>{children}</Static>;
  }

  const MotionEl = as === "tr" ? motion.tr : motion.div;

  return (
    <MotionEl
      className={className}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: ENTER_DURATION_SECONDS,
        delay: index * STAGGER_STEP_SECONDS,
        ease: "easeOut",
      }}
    >
      {children}
    </MotionEl>
  );
}
