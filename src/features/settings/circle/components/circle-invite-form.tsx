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
import { regenerateCircleInviteCode, updateCircleJoinPolicy } from "../actions";
import { notifyActionResult } from "@/lib/notify";
import type { JoinPolicy } from "@/lib/database.types";

// Distinct from the org-wide invite link in Settings > Organization: this
// code is what /signup's optional "circle invite code" field checks
// against, scoped to just this circle.
export function CircleInviteForm({
  circleId,
  joinPolicy,
  inviteCode,
}: {
  circleId: string;
  joinPolicy: JoinPolicy;
  inviteCode: string | null;
}) {
  const t = useTranslations("Settings");
  const POLICY_LABEL: Record<JoinPolicy, string> = {
    open_invite: t("circlePolicySkipsApproval"),
    approval_required: t("circlePolicyRequiresApproval"),
  };
  const [policy, setPolicy] = useState<JoinPolicy>(joinPolicy);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="circleJoinPolicySelect">{t("circleJoinPolicyQuestionLabel")}</Label>
        <Select
          value={policy}
          onValueChange={(next) => {
            if (!next) return;
            const nextPolicy = next as JoinPolicy;
            setPolicy(nextPolicy);
            startTransition(async () => {
              const result = await updateCircleJoinPolicy({ circleId, joinPolicy: nextPolicy });
              if (!result.ok) setError(result.error);
              // Optimistic: the select already shows the new policy, so only
              // toast on failure.
              notifyActionResult(result);
            });
          }}
        >
          <SelectTrigger id="circleJoinPolicySelect" className="w-full sm:w-72">
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="circleInviteCode">{t("circleInviteCodeLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="circleInviteCode"
            readOnly
            value={inviteCode ?? t("noCodeGeneratedYet")}
            className="flex-1 font-mono"
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await regenerateCircleInviteCode(circleId);
                if (!result.ok) setError(result.error);
                notifyActionResult(result, inviteCode ? t("inviteCodeRegeneratedToast") : t("inviteCodeGeneratedToast"));
              })
            }
          >
            {inviteCode ? t("regenerateButton") : t("generateButton")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("shareCodeHint")}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
