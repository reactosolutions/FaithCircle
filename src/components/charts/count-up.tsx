"use client";

import { useEffect, useState } from "react";
import { useReducedMotion, animate } from "motion/react";

// A number that counts up on first paint only (600ms) — never on refetch,
// since the animation only ever runs once per mount. Collapses to the
// final value instantly under prefers-reduced-motion.
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    // The initial useState value above already accounts for reduced
    // motion — nothing to animate, so nothing to set here.
    if (reduceMotion) return;
    const controls = animate(0, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- count up only on mount, never on prop change from a refetch
  }, []);

  return <span className={className}>{display}</span>;
}
