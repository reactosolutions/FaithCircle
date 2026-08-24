import { PageHeaderSkeleton, StatCardsSkeleton, SectionCardSkeleton } from "@/components/app-shell/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </CardContent>
      </Card>
      <StatCardsSkeleton />
      <SectionCardSkeleton lines={4} />
      <SectionCardSkeleton lines={3} />
    </div>
  );
}
