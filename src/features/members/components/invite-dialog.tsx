"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteMember } from "../actions";
import { USER_ROLES } from "../schema";
import { useRoleLabel } from "./role-badge";
import type { UserRole } from "@/lib/database.types";
import type { ActionResult } from "@/lib/action-result";

// No email system relied on for onboarding — the account is created and
// activated right away, and the temp password below is what the admin
// shares with the invitee directly (WhatsApp, in person, etc.) so they can
// sign in the first time.
function TempPasswordPanel({
  email,
  tempPassword,
  onDone,
}: {
  email: string;
  tempPassword: string;
  onDone: () => void;
}) {
  const t = useTranslations("Members");
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <IconCircle tone="success" size="xl">
        <Icon name="check" size={28} />
      </IconCircle>
      <div>
        <h3 className="font-heading text-base font-semibold text-foreground">
          {t("accountCreatedTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("shareTempPasswordHint", { email })}</p>
      </div>
      <div className="flex w-full flex-col gap-1.5 text-start">
        <Label htmlFor="tempPassword">{t("tempPasswordLabel")}</Label>
        <div className="flex gap-2">
          <Input id="tempPassword" readOnly value={tempPassword} className="flex-1 font-mono" />
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={async () => {
              await navigator.clipboard.writeText(tempPassword);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Icon name={copied ? "check" : "content_copy"} size={16} />
            {copied ? t("copiedButton") : t("copyButton")}
          </Button>
        </div>
      </div>
      <Button type="button" className="w-full rounded-full" onClick={onDone}>
        {t("doneButton")}
      </Button>
    </div>
  );
}

export function InviteDialog({
  viewerRole,
  circles,
}: {
  // 'admin' can invite as any role and pick any circle; 'administrative'
  // can only add students into a circle they lead — members.invite's
  // 'circle' scope, enforced again server-side, this just keeps the form
  // from offering choices the action would reject anyway.
  viewerRole: "admin" | "administrative";
  circles: { id: string; name: string }[];
}) {
  const t = useTranslations("Members");
  const ROLE_LABEL = useRoleLabel();
  const [role, setRole] = useState<UserRole>("student");
  const [circleId, setCircleId] = useState(circles.length === 1 ? circles[0].id : "");
  const [email, setEmail] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionResult<{ tempPassword: string }> | undefined,
    FormData
  >(inviteMember, undefined);

  const circleRequired = role !== "admin";

  function close() {
    setMobileOpen(false);
    setDesktopOpen(false);
  }

  const tempPassword = state?.ok ? state.data?.tempPassword : undefined;

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("addMemberTrigger")}
      title={t("addMemberTitle")}
      description={t("addMemberDescription")}
    >
      {tempPassword ? (
        <TempPasswordPanel email={email} tempPassword={tempPassword} onDone={close} />
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {viewerRole === "admin" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">{t("roleLabel")}</Label>
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
          )}
          {viewerRole === "administrative" && <input type="hidden" name="role" value="student" />}

          {circleRequired && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="circleId">{t("circleOptionalLabel")}</Label>
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
              {role === "administrative" && (
                <p className="text-xs text-muted-foreground">{t("circleLeaderHint")}</p>
              )}
            </div>
          )}

          {state && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending} className="rounded-full">
            {pending ? t("sendingButton") : t("sendInviteButton")}
          </Button>
        </form>
      )}
    </ResponsiveDialog>
  );
}
