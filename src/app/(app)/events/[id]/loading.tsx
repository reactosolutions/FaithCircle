import { DetailHeroSkeleton, SectionCardSkeleton } from "@/components/app-shell/page-skeletons";

export default function EventDetailLoading() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <DetailHeroSkeleton lines={5} />
      <SectionCardSkeleton lines={3} />
    </div>
  );
}
