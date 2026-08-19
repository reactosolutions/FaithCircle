import { useTranslations } from "next-intl";
import type { Database } from "@/lib/database.types";

type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];
type Formatter = (row: AuditRow) => string;

// A hook (not a plain function) because every sentence is built from
// translated templates — the actor/status/title values are data and stay
// as-is, but the surrounding verbs and connectors need next-intl's runtime
// locale, which only a hook (client) or getTranslations (server) can supply.
export function useFormatAuditRow() {
  const t = useTranslations("Settings");

  function actorName(row: AuditRow) {
    return row.actor_email ?? row.actor_role ?? t("auditActorFallback");
  }

  const FORMATTERS: Record<string, Formatter> = {
    attendance: (row) => {
      const status = String(row.new_data?.status ?? row.old_data?.status ?? "attendance");
      if (row.action === "insert") return t("auditAttendanceInsert", { actor: actorName(row), status });
      if (row.action === "update") return t("auditAttendanceUpdate", { actor: actorName(row), status });
      return t("auditAttendanceDelete", { actor: actorName(row) });
    },
    profiles: (row) => {
      if (row.changed_fields?.includes("role")) {
        return t("auditProfileRoleChanged", { actor: actorName(row), role: String(row.new_data?.role) });
      }
      if (row.changed_fields?.includes("status")) {
        return t("auditProfileStatusChanged", { actor: actorName(row), status: String(row.new_data?.status) });
      }
      return t("auditProfileUpdated", { actor: actorName(row) });
    },
    events: (row) => {
      if (row.action === "insert") {
        return t("auditEventScheduled", { actor: actorName(row), title: String(row.new_data?.title) });
      }
      if (row.action === "delete") {
        return t("auditEventCancelled", { actor: actorName(row), title: String(row.old_data?.title) });
      }
      return t("auditEventUpdated", {
        actor: actorName(row),
        title: String(row.new_data?.title ?? row.old_data?.title),
      });
    },
    circles: (row) =>
      t("auditCircleUpdated", {
        actor: actorName(row),
        name: String(row.new_data?.name ?? row.old_data?.name),
      }),
    assignments: (row) => {
      if (row.action === "insert") {
        return t("auditAssignmentCreated", { actor: actorName(row), title: String(row.new_data?.title) });
      }
      return t("auditAssignmentUpdated", {
        actor: actorName(row),
        title: String(row.new_data?.title ?? row.old_data?.title),
      });
    },
    submissions: (row) => {
      if (row.changed_fields?.includes("score") || row.changed_fields?.includes("feedback")) {
        return t("auditSubmissionReviewed", { actor: actorName(row) });
      }
      return t("auditSubmissionUpdated", { actor: actorName(row) });
    },
    data_export: (row) =>
      t("auditDataExport", {
        actor: actorName(row),
        count: String(row.context?.row_count ?? "some"),
        table: row.table_name,
      }),
  };

  return function formatAuditRow(row: AuditRow): string {
    if (row.action === "data_export") return FORMATTERS.data_export(row);

    const formatter = FORMATTERS[row.table_name];
    if (formatter) return formatter(row);

    const fieldCount = row.changed_fields?.length ?? 0;
    const detail = fieldCount > 0 ? t("auditFieldCount", { count: fieldCount }) : "";
    const key =
      row.action === "insert"
        ? "auditGenericCreated"
        : row.action === "delete"
          ? "auditGenericDeleted"
          : "auditGenericUpdated";
    return t(key, { actor: actorName(row), table: row.table_name }) + detail;
  };
}
