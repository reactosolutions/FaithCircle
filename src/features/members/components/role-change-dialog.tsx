"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionToast } from "@/hooks/use-action-toast";
import { useOnActionSuccess } from "@/hooks/use-on-action-success";
import { updateMemberRole } from "../actions";
import { USER_ROLES } from "../schema";
import { useRoleLabel } from "./role-badge";
import type { ActionResult } from "@/lib/action-result";
import type { UserRole } from "@/lib/database.types";

const roleChangeAction = async (
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> =>
  updateMemberRole({
    profileId: formData.get("profileId"),
    role: formData.get("role"),
    reason: formData.get("reason"),
    circleId: formData.get("circleId"),
    reassignLeaderId: formData.get("reassignLeaderId"),
    leaveLeaderless: formData.get("leaveLeaderless") === "true",
  });

export function RoleChangeDialog({
  profileId,
  memberName,
  currentRole,
  circles,
  administrativeCandidates,
}: {
  profileId: string;
  memberName: string;
  currentRole: UserRole;
  circles: { id: string; name: string }[];
  administrativeCandidates: { id: string; full_name: string | null }[];
}) {
  const t = useTranslations("RoleChange");
  const tMembers = useTranslations("Members");
  const ROLE_LABEL = useRoleLabel();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(currentRole);
  const [circleId, setCircleId] = useState("");
  const [demoteChoice, setDemoteChoice] = useState<"reassign" | "leaderless" | "">("");
  const [reassignLeaderId, setReassignLeaderId] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    roleChangeAction,
    undefined,
  );
  useActionToast(state, t("successToast"));
  useOnActionSuccess(state, () => {
    setMobileOpen(false);
    setDesktopOpen(false);
  });

  const isPromotingToAdministrative = role === "administrative" && currentRole !== "administrative";
  const isDemotingFromAdministrative = currentRole === "administrative" && role !== "administrative";
  const candidates = administrativeCandidates.filter((c) => c.id !== profileId);

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("trigger")}
      triggerVariant="outline"
      triggerIcon="swap_horiz"
      title={t("title", { name: memberName })}
      dialogContentClassName="sm:max-w-md"
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="profileId" value={profileId} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">{t("newRoleLabel")}</Label>
          <input type="hidden" name="role" value={role} />
          <Select value={role} onValueChange={(next) => next && setRole(next as UserRole)}>
            <SelectTrigger id="role" className="w-full">
              <SelectValue>{ROLE_LABEL[role]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isPromotingToAdministrative && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="circleId">{t("circleLabel")}</Label>
            <input type="hidden" name="circleId" value={circleId} />
            <Select value={circleId} onValueChange={(next) => setCircleId(next ?? "")}>
              <SelectTrigger id="circleId" className="w-full">
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
            <p className="text-xs text-muted-foreground">{t("circleHint")}</p>
          </div>
        )}

        {isDemotingFromAdministrative && (
          <div className="flex flex-col gap-2">
            <Label>{t("demoteQuestion")}</Label>
            <input
              type="hidden"
              name="reassignLeaderId"
              value={demoteChoice === "reassign" ? reassignLeaderId : ""}
            />
            <input
              type="hidden"
              name="leaveLeaderless"
              value={demoteChoice === "leaderless" ? "true" : ""}
            />
            <div className="flex flex-col gap-2">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="demoteChoiceRadio"
                  checked={demoteChoice === "reassign"}
                  onChange={() => setDemoteChoice("reassign")}
                />
                {t("reassignOption")}
              </label>
              {demoteChoice === "reassign" && (
                <Select value={reassignLeaderId} onValueChange={(next) => setReassignLeaderId(next ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("reassignPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name ?? tMembers("unnamed")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="demoteChoiceRadio"
                  checked={demoteChoice === "leaderless"}
                  onChange={() => setDemoteChoice("leaderless")}
                />
                {t("leaderlessOption")}
              </label>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason">{t("reasonLabel")}</Label>
          <Textarea id="reason" name="reason" rows={2} required placeholder={t("reasonPlaceholder")} />
        </div>

        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full rounded-full">
          {pending ? t("saveButtonPending") : t("saveButton")}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
