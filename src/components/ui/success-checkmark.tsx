"use client";

import { motion, useReducedMotion } from "motion/react";

// "Success confirmations: a brief checkmark draw, then fade" — CLAUDE.md's
// Motion section. The draw itself is this component; the fade is whatever
// container it sits in (the toast) fading on dismiss. Needs an actual SVG
// path (not the Material Symbols ligature font Icon renders) since only a
// real path has a strokeDasharray/pathLength to animate.
export function SuccessCheckmark({ size = 16 }: { size?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
      />
    </svg>
  );
}
