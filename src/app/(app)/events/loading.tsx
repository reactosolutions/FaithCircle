import { PageHeaderSkeleton } from "@/components/app-shell/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton withAction />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-11 w-48 rounded-lg md:h-8" />
        <Skeleton className="h-11 w-40 rounded-lg md:h-8" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <Skeleton className="aspect-square w-full rounded-xl md:aspect-video" />
    </div>
  );
}
