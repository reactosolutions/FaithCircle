"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "../actions";

// Supabase's client APIs don't expose a per-device session list (device
// name, last-seen) to the end user — that data isn't tracked in a way
// that's queryable outside the GoTrue admin API. "Sign out everywhere" is
// the one session-management action that's actually available: it revokes
// every refresh token for this account in one call.
export function SecuritySection() {
  const t = useTranslations("Settings");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t("securityDescription")}</p>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        className="w-fit rounded-full"
        onClick={() => startTransition(() => signOutEverywhere())}
      >
        {pending ? t("signingOutButton") : t("signOutEverywhereButton")}
      </Button>
    </div>
  );
}
