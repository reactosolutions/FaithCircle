import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { listAuditActors, listAuditLog } from "@/features/settings/organization/audit-queries";
import { AuditFilters } from "@/features/settings/organization/components/audit-filters";
import { AuditLogList } from "@/features/settings/organization/components/audit-log-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    actorId?: string;
    tableName?: string;
    action?: string;
    recordId?: string;
  }>;
}) {
  const supabase = await createClient();
  const user = await getCachedUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  if (profile?.role !== "admin") {
    notFound();
  }

  const params = await searchParams;
  const t = await getTranslations("Settings");
  const [rows, actors] = await Promise.all([
    listAuditLog({
      from: params.from,
      to: params.to,
      actorId: params.actorId,
      tableName: params.tableName,
      action: params.action,
      recordId: params.recordId,
    }),
    listAuditActors(),
  ]);

  const exportHref = `/api/export?table=audit&${new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("auditLogTitle")}
        action={
          <Button variant="outline" className="rounded-full" render={<a href={exportHref} />}>
            {t("exportCsvButton")}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("filtersTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditFilters
            actors={actors}
            from={params.from}
            to={params.to}
            actorId={params.actorId}
            tableName={params.tableName}
            action={params.action}
            recordId={params.recordId}
          />
        </CardContent>
      </Card>

      <AuditLogList rows={rows} />
    </div>
  );
}
