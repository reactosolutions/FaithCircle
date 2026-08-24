import { PageHeaderSkeleton, ListRowsSkeleton } from "@/components/app-shell/page-skeletons";

export default function AuditLogLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <ListRowsSkeleton rows={10} />
    </div>
  );
}
