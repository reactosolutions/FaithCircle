"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { approveSignup, rejectSignup } from "../actions";
import { notifyActionResult } from "@/lib/notify";

interface PendingProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  can_host: boolean;
}

function QueueRow({
  profile,
  circles,
}: {
  profile: PendingProfile;
  circles: { id: string; name: string }[];
}) {
  const t = useTranslations("Roles");
  const tSettings = useTranslations("Settings");
  const [circleId, setCircleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">
          {profile.full_name || profile.email || tSettings("unnamed")}
        </span>
        <span className="text-xs text-muted-foreground">
          {profile.email}
          {profile.phone ? ` · ${profile.phone}` : ""}
          {profile.can_host ? ` · ${tSettings("canHostShort")}` : ""}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={circleId} onValueChange={(next) => setCircleId(next ?? "")}>
          <SelectTrigger size="sm" className="min-w-40">
            <SelectValue placeholder={t("circlePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {circles.map((circle) => (
              <SelectItem key={circle.id} value={circle.id}>
                {circle.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await approveSignup(profile.id, circleId || undefined);
              if (!result.ok) setError(result.error);
              notifyActionResult(result, "Member approved.");
            });
          }}
        >
          {t("approveButton")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await rejectSignup(profile.id);
              if (!result.ok) setError(result.error);
              notifyActionResult(result, "Signup rejected.");
            });
          }}
        >
          {t("rejectButton")}
        </Button>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function PendingApprovalQueue({
  profiles,
  circles,
}: {
  profiles: PendingProfile[];
  circles: { id: string; name: string }[];
}) {
  const t = useTranslations("Roles");
  if (profiles.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{t("pendingApprovalEmpty")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {profiles.map((profile) => (
        <QueueRow key={profile.id} profile={profile} circles={circles} />
      ))}
    </div>
  );
}
