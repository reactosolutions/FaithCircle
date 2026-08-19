"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateHosting } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function HostingForm({ profile }: { profile: Profile }) {
  const t = useTranslations("Settings");
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    updateHosting,
    undefined,
  );
  useActionToast(state, t("hostingSavedToast"));
  const [canHost, setCanHost] = useState(profile.can_host);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="canHost">{t("availableToHostLabel")}</Label>
          <span className="text-xs text-muted-foreground">{t("availableToHostHint")}</span>
        </div>
        <Switch id="canHost" name="canHost" checked={canHost} onCheckedChange={setCanHost} />
      </div>

      {canHost && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="homeAddress">{t("homeAddressLabel")}</Label>
            <Input
              id="homeAddress"
              name="homeAddress"
              defaultValue={profile.home_address ?? ""}
              placeholder={t("homeAddressPlaceholder")}
            />
            {/* A drag-pin map for correcting the geocoded location is
                deferred — it needs a map provider decision (Mapbox/Google/
                Leaflet+OSM) with real cost/key implications, which isn't
                mine to make silently. Plain address text for now. */}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hostCapacity">{t("hostCapacityLabel")}</Label>
            <Input
              id="hostCapacity"
              name="hostCapacity"
              type="number"
              min={1}
              defaultValue={profile.host_capacity ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="homeArrivalNotes">{t("arrivalNotesLabel")}</Label>
            <Textarea
              id="homeArrivalNotes"
              name="homeArrivalNotes"
              rows={3}
              placeholder={t("arrivalNotesPlaceholder")}
              defaultValue={profile.home_arrival_notes ?? ""}
            />
          </div>
        </>
      )}

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
