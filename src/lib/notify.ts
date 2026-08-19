import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

// For imperative Server Action calls (button onClick + startTransition,
// rather than a form's useActionState) — awaits the action's own
// { ok, error } result and surfaces it the same way useActionToast does for
// forms. Pass no successMessage for actions where success is silent (e.g. a
// toggle that already shows its new state optimistically).
export function notifyActionResult<T>(result: ActionResult<T>, successMessage?: string) {
  if (result.ok) {
    if (successMessage) toast.success(successMessage);
  } else {
    toast.error(result.error);
  }
}
