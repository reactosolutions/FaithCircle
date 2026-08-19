"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "./status-badge";
import { useRoleLabel } from "./role-badge";
import { EditMemberDialog } from "./edit-member-dialog";
import { RoleChangeDialog } from "./role-change-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { CancelInvitationDialog } from "./cancel-invitation-dialog";
import { notifyActionResult } from "@/lib/notify";
import { updateMemberStatus } from "../actions";
import type { MemberRow } from "./members-table";

type DialogKey = "edit" | "role" | "reset" | "cancel" | null;

// One list row per member on phone (CLAUDE.md's "never stack a data table
// into a multi-line card" rule doesn't leave room for the 4-5 separate icon
// action buttons the desktop table shows inline) — every action collapses
// into a single "more" menu, and each dialog it opens is driven externally
// via its mobileOpen/onMobileOpenChange controls rather than its own
// built-in trigger (see ResponsiveDialog's hideMobileTrigger).
export function MemberMobileRow({
  member,
  isAdmin,
  selected,
  onToggleSelect,
  circles,
  administrativeCandidates,
  phone,
}: {
  member: MemberRow;
  isAdmin: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  circles: { id: string; name: string }[];
  administrativeCandidates: { id: string; full_name: string | null }[];
  phone: string | null;
}) {
  const t = useTranslations("Members");
  const tRoleChange = useTranslations("RoleChange");
  const ROLE_LABEL = useRoleLabel();
  const [dialog, setDialog] = useState<DialogKey>(null);
  const [status, setStatus] = useState(member.status);
  const [pending, startTransition] = useTransition();
  const name = member.full_name || member.email || t("unnamed");

  function toggleStatus() {
    const next = status === "inactive" ? "active" : "inactive";
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateMemberStatus({ profileId: member.id, status: next });
      if (!result.ok) setStatus(previous);
      notifyActionResult(result, next === "inactive" ? t("deactivatedToast") : t("reactivatedToast"));
    });
  }

  return (
    <div className="flex h-14 items-center gap-2 px-4">
      {isAdmin && (
        <input type="checkbox" aria-label={name} checked={selected} onChange={onToggleSelect} />
      )}
      <Link href={`/members/${member.id}`} className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">{name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{ROLE_LABEL[member.role]}</span>
      </Link>
      <div className="shrink-0">
        <StatusBadge status={status} />
      </div>
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("moreActionsLabel")}
                className="shrink-0 rounded-full"
              />
            }
          >
            <Icon name="more_vert" size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setDialog("edit")}>
              <Icon name="edit" size={16} />
              {t("editTrigger")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialog("role")}>
              <Icon name="swap_horiz" size={16} />
              {tRoleChange("trigger")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialog("reset")}>
              <Icon name="lock_reset" size={16} />
              {t("resetPasswordTrigger")}
            </DropdownMenuItem>
            {member.status === "invited" ? (
              <DropdownMenuItem variant="destructive" onClick={() => setDialog("cancel")}>
                <Icon name="person_remove" size={16} />
                {t("cancelInvitationTrigger")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant={status === "inactive" ? "default" : "destructive"}
                onClick={toggleStatus}
              >
                <Icon name={status === "inactive" ? "check_circle" : "block"} size={16} />
                {pending ? "…" : status === "inactive" ? t("reactivate") : t("deactivate")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <EditMemberDialog
        profileId={member.id}
        fullName={member.full_name}
        phone={phone}
        mobileOpen={dialog === "edit"}
        onMobileOpenChange={(open) => setDialog(open ? "edit" : null)}
      />
      <RoleChangeDialog
        profileId={member.id}
        memberName={name}
        currentRole={member.role}
        circles={circles}
        administrativeCandidates={administrativeCandidates}
        mobileOpen={dialog === "role"}
        onMobileOpenChange={(open) => setDialog(open ? "role" : null)}
      />
      <ResetPasswordDialog
        profileId={member.id}
        email={member.email ?? ""}
        mobileOpen={dialog === "reset"}
        onMobileOpenChange={(open) => setDialog(open ? "reset" : null)}
      />
      {member.status === "invited" && (
        <CancelInvitationDialog
          profileId={member.id}
          memberName={name}
          mobileOpen={dialog === "cancel"}
          onMobileOpenChange={(open) => setDialog(open ? "cancel" : null)}
        />
      )}
    </div>
  );
}
