"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { completeProfile } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";

export function CompleteProfileForm({ initialPhone = "" }: { initialPhone?: string }) {
  const t = useTranslations("CompleteProfile");
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    completeProfile,
    undefined,
  );
  useActionToast(state, "Profile completed.");
  const [canHost, setCanHost] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">{t("phoneLabel")}</Label>
        <PhoneInput id="phone" name="phone" defaultValue={initialPhone} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="canHost">{t("canHostLabel")}</Label>
          <span className="text-xs text-muted-foreground">You can change this anytime in Settings.</span>
        </div>
        <Switch id="canHost" name="canHost" checked={canHost} onCheckedChange={setCanHost} />
      </div>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="rounded-full">
        {pending ? t("submitButtonPending") : t("submitButton")}
      </Button>
    </form>
  );
}
