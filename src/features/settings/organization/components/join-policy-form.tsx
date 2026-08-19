"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { regenerateInviteLink, updateJoinPolicy } from "../actions";
import { notifyActionResult } from "@/lib/notify";
import type { JoinPolicy } from "@/lib/database.types";

export function JoinPolicyForm({
  joinPolicy,
  inviteLinkToken,
  siteOrigin,
}: {
  joinPolicy: JoinPolicy;
  inviteLinkToken: string | null;
  siteOrigin: string;
}) {
  const t = useTranslations("Settings");
  const POLICY_LABEL: Record<JoinPolicy, string> = {
    open_invite: t("joinPolicyOpenInvite"),
    approval_required: t("joinPolicyApprovalRequired"),
  };
  const [policy, setPolicy] = useState<JoinPolicy>(joinPolicy);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="joinPolicySelect">{t("joinPolicyTitle")}</Label>
        <Select
          value={policy}
          onValueChange={(next) => {
            if (!next) return;
            const nextPolicy = next as JoinPolicy;
            setPolicy(nextPolicy);
            startTransition(async () => {
              const result = await updateJoinPolicy({ joinPolicy: nextPolicy });
              if (!result.ok) setError(result.error);
              // Optimistic: the select already shows the new policy, so only
              // toast on failure.
              notifyActionResult(result);
            });
          }}
        >
          <SelectTrigger id="joinPolicySelect" className="w-full sm:w-64">
            <SelectValue>{POLICY_LABEL[policy]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(POLICY_LABEL) as JoinPolicy[]).map((value) => (
              <SelectItem key={value} value={value}>
                {POLICY_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {policy === "open_invite" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inviteLink">{t("inviteLinkLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="inviteLink"
              readOnly
              value={
                inviteLinkToken ? `${siteOrigin}/join/${inviteLinkToken}` : t("noLinkGeneratedYet")
              }
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await regenerateInviteLink();
                  if (!result.ok) setError(result.error);
                  notifyActionResult(result, inviteLinkToken ? t("inviteLinkRegeneratedToast") : t("inviteLinkGeneratedToast"));
                })
              }
            >
              {inviteLinkToken ? t("regenerateButton") : t("generateButton")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("inviteLinkHint")}</p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
