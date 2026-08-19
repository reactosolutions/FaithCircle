"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { CheckboxList } from "@/components/ui/checkbox-list";
import { SegmentedControl } from "./segmented-control";
import { useAudienceOptions, type InviteCandidate, type OtherCircle } from "./constants";
import type { EventAudience } from "@/lib/database.types";

// "Who's invited" — the audience toggle plus whichever picker it implies
// (other circles to invite in, or specific people to add ad hoc).
export function AudienceFields({
  audience,
  onAudienceChange,
  otherCircles,
  extraCircleIds,
  onExtraCircleIdsChange,
  inviteCandidates,
  inviteeIds,
  onInviteeIdsChange,
  invitedCount,
}: {
  audience: EventAudience;
  onAudienceChange: (audience: EventAudience) => void;
  otherCircles: OtherCircle[];
  extraCircleIds: string[];
  onExtraCircleIdsChange: (ids: string[]) => void;
  inviteCandidates: InviteCandidate[];
  inviteeIds: string[];
  onInviteeIdsChange: (ids: string[]) => void;
  invitedCount: number;
}) {
  const t = useTranslations("Events");
  const AUDIENCE_OPTIONS = useAudienceOptions();
  return (
    <div className="flex flex-col gap-2">
      <Label>{t("whosInvited")}</Label>
      <input type="hidden" name="audience" value={audience} />
      <SegmentedControl
        options={AUDIENCE_OPTIONS}
        value={audience}
        onChange={(next) => {
          onAudienceChange(next);
          if (next !== "multi_circle") onExtraCircleIdsChange([]);
          if (next !== "custom") onInviteeIdsChange([]);
        }}
      />

      {audience === "multi_circle" && (
        <>
          <input type="hidden" name="extraCircleIds" value={extraCircleIds.join(",")} />
          <CheckboxList
            options={otherCircles.map((circle) => ({
              id: circle.id,
              label: circle.name,
              meta: circle.memberCount,
            }))}
            selectedIds={extraCircleIds}
            onToggle={(id) =>
              onExtraCircleIdsChange(
                extraCircleIds.includes(id)
                  ? extraCircleIds.filter((x) => x !== id)
                  : [...extraCircleIds, id],
              )
            }
            emptyLabel={t("noOtherCirclesYet")}
            maxHeightClassName="max-h-40"
          />
        </>
      )}

      {audience === "custom" && (
        <>
          <input type="hidden" name="inviteeIds" value={inviteeIds.join(",")} />
          <CheckboxList
            options={inviteCandidates.map((profile) => ({
              id: profile.id,
              label: profile.full_name ?? profile.email,
            }))}
            selectedIds={inviteeIds}
            onToggle={(id) =>
              onInviteeIdsChange(
                inviteeIds.includes(id) ? inviteeIds.filter((x) => x !== id) : [...inviteeIds, id],
              )
            }
            emptyLabel={t("noOneElseToInvite")}
            maxHeightClassName="max-h-40"
          />
        </>
      )}

      <p className="text-xs text-muted-foreground">{t("peopleWillBeInvited", { count: invitedCount })}</p>
    </div>
  );
}
