"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { useFormatAuditRow } from "../audit-formatters";
import { AuditRowDiff } from "./audit-row-diff";
import type { Database } from "@/lib/database.types";

type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];

function AuditLogRow({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false);
  const formatAuditRow = useFormatAuditRow();

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center justify-between gap-3 text-start"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground">{formatAuditRow(row)}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(row.occurred_at), "MMM d, yyyy h:mm a")}
          </span>
        </div>
        <Icon
          name="expand_more"
          size={16}
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <AuditRowDiff changedFields={row.changed_fields} oldData={row.old_data} newData={row.new_data} />
      )}
    </div>
  );
}

export function AuditLogList({ rows }: { rows: AuditRow[] }) {
  const t = useTranslations("Settings");
  if (rows.length === 0) {
    return <EmptyState icon="history" title={t("noMatchingEntries")} />;
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {rows.map((row) => (
        <AuditLogRow key={row.id} row={row} />
      ))}
    </div>
  );
}
