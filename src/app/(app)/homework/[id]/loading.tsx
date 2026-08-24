import { DetailHeroSkeleton, SectionCardSkeleton } from "@/components/app-shell/page-skeletons";

export default function AssignmentDetailLoading() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <DetailHeroSkeleton lines={4} />
      <SectionCardSkeleton lines={3} />
    </div>
  );
}
