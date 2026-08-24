import { PageHeaderSkeleton, ListRowsSkeleton } from "@/components/app-shell/page-skeletons";

export default function MoreLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <ListRowsSkeleton rows={5} withTrailing={false} />
    </div>
  );
}
