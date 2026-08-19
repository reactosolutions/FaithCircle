"use server";

import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { updatePrivacySchema } from "./schema";

export async function updatePrivacy(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updatePrivacySchema.safeParse({
    phoneVisibility: formData.get("phoneVisibility"),
    hideAddressUntilRsvp: formData.get("hideAddressUntilRsvp"),
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
      phone_visibility: parsed.data.phoneVisibility,
      hide_address_until_rsvp: parsed.data.hideAddressUntilRsvp,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not save your privacy settings." };
  }

  refresh();
  return { ok: true };
}
