"use server";

import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { updateOwnProfileSchema } from "./schema";

export async function updateOwnProfile(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateOwnProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    canHost: formData.get("canHost"),
    homeAddress: formData.get("homeAddress"),
    hostCapacity: formData.get("hostCapacity"),
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
      full_name: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
      can_host: parsed.data.canHost,
      home_address: parsed.data.homeAddress ?? null,
      host_capacity: parsed.data.hostCapacity ?? null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not save your profile." };
  }

  refresh();
  return { ok: true };
}
