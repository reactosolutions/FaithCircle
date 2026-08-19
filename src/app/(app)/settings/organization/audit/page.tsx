import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getViewerProfile } from "@/features/members/queries";
import { listAuditActors, listAuditLog } from "@/features/settings/organization/audit-queries";
import { AuditFilters } from "@/features/settings/organization/components/audit-filters";
import { AuditLogList } from "@/features/settings/organization/components/audit-log-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
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
    page?: string;
  }>;
}) {
  const profile = await getViewerProfile();

  if (profile?.role !== "admin") {
    notFound();
  }

  const params = await searchParams;
  const t = await getTranslations("Settings");
  const page = Math.max(1, Number(params.page) || 1);
  const [{ rows, total, pageSize }, actors] = await Promise.all([
    listAuditLog({
      from: params.from,
      to: params.to,
      actorId: params.actorId,
      tableName: params.tableName,
      action: params.action,
      recordId: params.recordId,
      page,
    }),
    listAuditActors(),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

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

      <Pagination
        page={page}
        pageCount={pageCount}
        basePath="/settings/organization/audit"
        searchParams={{
          from: params.from,
          to: params.to,
          actorId: params.actorId,
          tableName: params.tableName,
          action: params.action,
          recordId: params.recordId,
        }}
      />
    </div>
  );
}
