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
import { notifyActionResult } from "@/lib/notify";
import { bulkUpdateMemberStatus } from "../actions";
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

  function run(action: () => Promise<ActionResult>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      notifyActionResult(result, result.ok ? successMessage : undefined);
      if (result.ok) onDone();
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
      </div>
    </div>
  );
}
