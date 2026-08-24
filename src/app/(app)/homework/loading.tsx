import { PageHeaderSkeleton, ListRowsSkeleton } from "@/components/app-shell/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeworkLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton withAction />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-11 w-56 rounded-lg md:h-8" />
      </div>
      <ListRowsSkeleton rows={6} />
    </div>
  );
}
