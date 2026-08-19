"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

// Below md (CLAUDE.md's own breakpoint) — for the handful of cases that
// need it in JS rather than CSS, e.g. capping a chart's x-axis tick count
// per the Dashboards section's mobile rule. useSyncExternalStore (not a
// useState+useEffect pair) so the browser's matchMedia state is the single
// source of truth and there's no synchronous setState-in-effect render
// cascade; the server snapshot is `false` to match first paint before
// hydration can read the real viewport. Prefer a Tailwind `md:` class over
// this whenever plain CSS can do the job instead.
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
