import { PageHeaderSkeleton, ListRowsSkeleton } from "@/components/app-shell/page-skeletons";

export default function AttendanceLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <ListRowsSkeleton rows={6} withTrailing={false} />
    </div>
  );
}
