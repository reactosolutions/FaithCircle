import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { listAuditLogForRecord } from "../audit-queries";
import { AuditLogList } from "./audit-log-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// A compact, record-scoped slice of the same audit log the full viewer
// shows — admin only, same as /settings/organization/audit. This is the
// view people actually use day to day; the global log is for
// investigations. Simplified to a card rather than full tab chrome, since
// building a separate tabbed layout on three different detail pages for
// one history list wasn't worth the duplication.
export async function AuditHistorySection({
  tableName,
  recordId,
}: {
  tableName: string;
  recordId: string;
}) {
  const supabase = await createClient();
  const user = await getCachedUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  if (profile?.role !== "admin") {
    return null;
  }

  const [rows, t] = await Promise.all([
    listAuditLogForRecord(tableName, recordId),
    getTranslations("Settings"),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <AuditLogList rows={rows} />
      </CardContent>
    </Card>
  );
}
