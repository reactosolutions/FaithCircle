import { PageHeaderSkeleton, ListRowsSkeleton } from "@/components/app-shell/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton withAction />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-40 rounded-lg md:h-8" />
        <Skeleton className="h-11 w-28 rounded-lg md:h-8" />
        <Skeleton className="h-11 w-28 rounded-lg md:h-8" />
      </div>
      <ListRowsSkeleton rows={8} />
    </div>
  );
}
