"use client";

import { useEffect, useId } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

// Fires a toast whenever a useActionState result changes — success (once,
// with `successMessage`) or failure (with the action's own error string).
// Skips the initial mount, since useActionState's state starts undefined
// before any submission. Toasts use a stable per-instance id (useId, not
// the state object itself) so React 19 Strict Mode's double effect-fire in
// dev replaces the toast instead of stacking two identical ones.
export function useActionToast(state: ActionResult | undefined, successMessage: string) {
  const id = useId();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(successMessage, { id });
    } else {
      toast.error(state.error, { id });
    }
    // successMessage is the caller's static copy for this form, not a
    // reactive value — only `state` should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
