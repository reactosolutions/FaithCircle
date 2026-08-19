"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PHONE_VISIBILITIES, usePhoneVisibilityLabel } from "../schema";
import { updatePrivacy } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import type { PhoneVisibility } from "@/lib/database.types";

export function PrivacyForm({
  phoneVisibility,
  hideAddressUntilRsvp,
}: {
  phoneVisibility: PhoneVisibility;
  hideAddressUntilRsvp: boolean;
}) {
  const t = useTranslations("Settings");
  const PHONE_VISIBILITY_LABEL = usePhoneVisibilityLabel();
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    updatePrivacy,
    undefined,
  );
  useActionToast(state, t("privacySavedToast"));
  const [visibility, setVisibility] = useState<PhoneVisibility>(phoneVisibility);
  const [hideAddress, setHideAddress] = useState(hideAddressUntilRsvp);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="phoneVisibility" value={visibility} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phoneVisibilitySelect">{t("whoCanSeePhoneLabel")}</Label>
        <Select
          value={visibility}
          onValueChange={(next) => next && setVisibility(next as PhoneVisibility)}
        >
          <SelectTrigger id="phoneVisibilitySelect" className="w-full sm:w-64">
            <SelectValue>{PHONE_VISIBILITY_LABEL[visibility]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PHONE_VISIBILITIES.map((value) => (
              <SelectItem key={value} value={value}>
                {PHONE_VISIBILITY_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="hideAddressUntilRsvp">{t("hideAddressLabel")}</Label>
          <span className="text-xs text-muted-foreground">{t("hideAddressHint")}</span>
        </div>
        <Switch
          id="hideAddressUntilRsvp"
          name="hideAddressUntilRsvp"
          checked={hideAddress}
          onCheckedChange={setHideAddress}
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-success">{t("savedMessage")}</p>}

      <Button type="submit" disabled={pending} className="w-fit rounded-full">
        {pending ? t("savingButton") : t("saveButton")}
      </Button>
    </form>
  );
}
