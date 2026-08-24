import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/app-shell/page-skeletons";

export default function CircleDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton withAction />
      <SectionCardSkeleton lines={3} />
      <SectionCardSkeleton lines={5} />
    </div>
  );
}
