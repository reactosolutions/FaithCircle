"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { CheckboxList } from "@/components/ui/checkbox-list";
import { addCircleMembers } from "../actions";
import { notifyActionResult } from "@/lib/notify";

// Reuses addCircleMembers (circleId, memberIds) one call per selected
// circle rather than adding a new circleIds-plural action — this is the
// member-detail page's reverse of the circle page's own "Add members"
// dialog, not a different write.
export function AssignCirclesDialog({
  profileId,
  candidates,
}: {
  profileId: string;
  candidates: { id: string; name: string }[];
}) {
  const t = useTranslations("Circles");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  // Pre-check the only option when there's just one candidate circle — same
  // convenience as InviteDialog's single-circle default, since requiring a
  // click to select the one and only choice is pure friction.
  const [selectedIds, setSelectedIds] = useState<string[]>(
    candidates.length === 1 ? [candidates[0].id] : [],
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function assign() {
    setError(null);
    startTransition(async () => {
      const results = await Promise.all(
        selectedIds.map((circleId) => addCircleMembers({ circleId, memberIds: [profileId] })),
      );
      const failed = results.find((result) => !result.ok);
      if (failed && !failed.ok) {
        setError(failed.error);
        return;
      }
      notifyActionResult({ ok: true }, t("addedToCircleToast"));
      setSelectedIds([]);
      setMobileOpen(false);
      setDesktopOpen(false);
    });
  }

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("assignTrigger")}
      title={t("assignTitle")}
      description={t("assignDescription")}
    >
      <div className="flex flex-col gap-3">
        <CheckboxList
          options={candidates.map((c) => ({ id: c.id, label: c.name }))}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((current) =>
              current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
            )
          }
          emptyLabel={t("noOtherCircles")}
          maxHeightClassName="max-h-64"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="button"
          disabled={pending || selectedIds.length === 0}
          onClick={assign}
          className="rounded-full"
        >
          {pending ? t("assigningButton") : t("assignButton", { count: selectedIds.length })}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
