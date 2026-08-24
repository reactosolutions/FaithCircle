import { PageHeaderSkeleton, ListRowsSkeleton } from "@/components/app-shell/page-skeletons";

export default function NotificationsLoading() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeaderSkeleton />
      <ListRowsSkeleton rows={6} withTrailing={false} />
    </div>
  );
}
