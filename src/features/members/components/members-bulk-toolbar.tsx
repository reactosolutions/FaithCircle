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
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { toast } from "sonner";
import { notifyActionResult } from "@/lib/notify";
import { bulkDeleteMembers, bulkUpdateMemberStatus } from "../actions";
import { approveSignups, rejectSignups } from "@/features/settings/organization/actions";
import type { ActionResult } from "@/lib/action-result";

// Admin-only (matches settings.organization and members.deactivate both
// being admin='all' — see the Permissions matrix), shown above the table
// whenever 1+ rows are selected. All four actions stay visible regardless
// of the selected rows' current statuses rather than trying to compute
// which apply — approveSignups/rejectSignups already no-op on anything not
// currently 'pending' (their .eq("status","pending") filter), and
// activating/deactivating a row already in that state is harmless.
export function MembersBulkToolbar({
  selectedIds,
  circles,
  onDone,
}: {
  selectedIds: string[];
  circles: { id: string; name: string }[];
  onDone: () => void;
}) {
  const t = useTranslations("Members");
  const [circleId, setCircleId] = useState("");
  const [pending, startTransition] = useTransition();
  const [deleteMobileOpen, setDeleteMobileOpen] = useState(false);
  const [deleteDesktopOpen, setDeleteDesktopOpen] = useState(false);

  function run(action: () => Promise<ActionResult>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      notifyActionResult(result, result.ok ? successMessage : undefined);
      if (result.ok) onDone();
    });
  }

  // Deletion is irreversible (unlike the reversible actions above), so it's
  // the one button in this toolbar that goes through a confirm step first —
  // and unlike the fixed success strings above, the toast has to be built
  // from what actually happened: some selected rows may have real history
  // and get silently skipped rather than deleted (see bulkDeleteMembers).
  function handleDelete() {
    startTransition(async () => {
      const result = await bulkDeleteMembers({ profileIds: selectedIds });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { deletedCount, skippedCount } = result.data ?? { deletedCount: 0, skippedCount: 0 };
      toast.success(
        skippedCount > 0
          ? t("bulkDeletedWithSkippedToast", { deleted: deletedCount, skipped: skippedCount })
          : t("bulkDeletedToast", { count: deletedCount }),
      );
      setDeleteMobileOpen(false);
      setDeleteDesktopOpen(false);
      onDone();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
      <span className="text-sm font-medium text-foreground">
        {t("selectedCount", { count: selectedIds.length })}
      </span>
      <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
        <Select value={circleId} onValueChange={(next) => setCircleId(next ?? "")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("bulkApproveCirclePlaceholder")} />
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
          variant="outline"
          className="rounded-full"
          disabled={pending}
          onClick={() =>
            run(() => approveSignups(selectedIds, circleId || undefined), t("bulkApprovedToast"))
          }
        >
          {t("bulkApproveButton")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={pending}
          onClick={() => run(() => rejectSignups(selectedIds), t("bulkRejectedToast"))}
        >
          {t("bulkRejectButton")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={pending}
          onClick={() =>
            run(
              () => bulkUpdateMemberStatus({ profileIds: selectedIds, status: "inactive" }),
              t("bulkDeactivatedToast"),
            )
          }
        >
          {t("bulkDeactivateButton")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={pending}
          onClick={() =>
            run(
              () => bulkUpdateMemberStatus({ profileIds: selectedIds, status: "active" }),
              t("bulkReactivatedToast"),
            )
          }
        >
          {t("bulkReactivateButton")}
        </Button>
        <ResponsiveDialog
          mobileOpen={deleteMobileOpen}
          onMobileOpenChange={setDeleteMobileOpen}
          desktopOpen={deleteDesktopOpen}
          onDesktopOpenChange={setDeleteDesktopOpen}
          triggerLabel={t("bulkDeleteButton")}
          triggerVariant="destructive"
          title={t("bulkDeleteTitle")}
          description={t("bulkDeleteDescription", { count: selectedIds.length })}
        >
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            className="w-full rounded-full"
            onClick={handleDelete}
          >
            {pending ? t("deletingButton") : t("bulkDeleteConfirmButton")}
          </Button>
        </ResponsiveDialog>
      </div>
    </div>
  );
}
