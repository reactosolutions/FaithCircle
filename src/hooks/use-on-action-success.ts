"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/action-result";

// Run a callback exactly once when a useActionState result transitions to
// success — closing a ResponsiveDialog, starting a resend cooldown, showing
// a "check your email" confirmation screen. Every one of those was hand-
// rolling the same comparison. Adjusted during render (comparing against
// the last-seen state) rather than in a useEffect, per
// https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
export function useOnActionSuccess(state: ActionResult | undefined, onSuccess: () => void) {
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state?.ok) onSuccess();
  }
}
