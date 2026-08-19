"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckboxList } from "@/components/ui/checkbox-list";
import { cn } from "@/lib/utils";
import { useActionToast } from "@/hooks/use-action-toast";
import { useOnActionSuccess } from "@/hooks/use-on-action-success";
import { createCircle } from "../actions";
import type { ActionResult } from "@/lib/action-result";

interface Candidate {
  id: string;
  full_name: string | null;
  email?: string | null;
}

export function CreateCircleDialog({
  advisorCandidates,
  studentCandidates,
}: {
  advisorCandidates: Candidate[];
  studentCandidates: Candidate[];
}) {
  const t = useTranslations("Circles");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [advisorIds, setAdvisorIds] = useState<string[]>([]);
  const [membershipMode, setMembershipMode] = useState<"students" | "code">("students");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    createCircle,
    undefined,
  );
  useActionToast(state, t("createdToast"));
  useOnActionSuccess(state, () => {
    setMobileOpen(false);
    setDesktopOpen(false);
    setAdvisorIds([]);
    setMembershipMode("students");
    setMemberIds([]);
  });

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("createTrigger")}
      title={t("createTitle")}
      description={t("createDescription")}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input id="name" name="name" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("advisorsOptionalLabel")}</Label>
          <input type="hidden" name="advisorIds" value={advisorIds.join(",")} />
          <CheckboxList
            options={advisorCandidates.map((c) => ({ id: c.id, label: c.full_name ?? c.email ?? t("unnamed") }))}
            selectedIds={advisorIds}
            onToggle={(id) => setAdvisorIds((current) => toggle(current, id))}
            emptyLabel={t("noAdvisorsYet")}
            maxHeightClassName="max-h-40"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("membersLabel")}</Label>
          <input type="hidden" name="membershipMode" value={membershipMode} />
          <div className="inline-flex w-full gap-1 rounded-full border border-border p-1">
            {(
              [
                { value: "students", label: t("addStudentsOption") },
                { value: "code", label: t("inviteByCodeOption") },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMembershipMode(option.value)}
                className={cn(
                  "min-h-9 flex-1 rounded-full px-3 text-sm font-medium transition-colors",
                  membershipMode === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {membershipMode === "students" ? (
            <>
              <input type="hidden" name="memberIds" value={memberIds.join(",")} />
              <CheckboxList
                options={studentCandidates.map((c) => ({ id: c.id, label: c.full_name ?? c.email ?? t("unnamed") }))}
                selectedIds={memberIds}
                onToggle={(id) => setMemberIds((current) => toggle(current, id))}
                emptyLabel={t("noStudentsYet")}
                maxHeightClassName="max-h-40"
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("joinCodeHint")}</p>
          )}
        </div>

        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="rounded-full">
          {pending ? t("creatingButton") : t("createButton")}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
