"use server";

import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { addBlackoutDateSchema, updateHostingSchema } from "./schema";

export async function updateHosting(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateHostingSchema.safeParse({
    canHost: formData.get("canHost"),
    homeAddress: formData.get("homeAddress"),
    hostCapacity: formData.get("hostCapacity"),
    homeArrivalNotes: formData.get("homeArrivalNotes"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      can_host: parsed.data.canHost,
      home_address: parsed.data.homeAddress ?? null,
      host_capacity: parsed.data.hostCapacity ?? null,
      home_arrival_notes: parsed.data.homeArrivalNotes ?? null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not save your hosting settings." };
  }

  refresh();
  return { ok: true };
}

export async function addBlackoutDate(input: unknown): Promise<ActionResult> {
  const parsed = addBlackoutDateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { error } = await supabase.from("host_blackout_dates").insert({
    profile_id: user.id,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
  });

  if (error) {
    return { ok: false, error: "Could not add that date range." };
  }

  refresh();
  return { ok: true };
}

export async function removeBlackoutDate(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { error } = await supabase
    .from("host_blackout_dates")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    return { ok: false, error: "Could not remove that date range." };
  }

  refresh();
  return { ok: true };
}
