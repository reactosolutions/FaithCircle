"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";
import { updateOwnProfile } from "../actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    updateOwnProfile,
    undefined,
  );
  useActionToast(state, "Profile saved.");
  const [canHost, setCanHost] = useState(profile.can_host);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <PhoneInput id="phone" name="phone" defaultValue={profile.phone} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="canHost">Available to host meetings</Label>
          <span className="text-xs text-muted-foreground">
            Show up as a host option when your circle leader schedules a meeting.
          </span>
        </div>
        <Switch id="canHost" name="canHost" checked={canHost} onCheckedChange={setCanHost} />
      </div>

      {canHost && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="homeAddress">Home address</Label>
            <Input
              id="homeAddress"
              name="homeAddress"
              defaultValue={profile.home_address ?? ""}
              placeholder="Shown to your circle leader when they pick a host"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hostCapacity">How many people can you host?</Label>
            <Input
              id="hostCapacity"
              name="hostCapacity"
              type="number"
              min={1}
              defaultValue={profile.host_capacity ?? ""}
            />
          </div>
        </>
      )}

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending} className="w-fit rounded-full">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
