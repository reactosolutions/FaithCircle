// "Below md, charts ... drop to a maximum of 6 x-axis labels" (CLAUDE.md's
// Dashboards section). Recharts' XAxis `interval` prop is a skip count, not
// a target count, so this converts "show at most N labels out of `count`"
// into the right skip value; 0 (show every tick) when already within N.
export const MAX_MOBILE_X_LABELS = 6;

export function xAxisTickInterval(count: number, maxLabels: number = MAX_MOBILE_X_LABELS) {
  if (count <= maxLabels) return 0;
  return Math.ceil(count / maxLabels) - 1;
}
