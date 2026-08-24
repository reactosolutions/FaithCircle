import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/app-shell/page-skeletons";

export default function AccountSettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <SectionCardSkeleton lines={4} withTitle={false} />
      <SectionCardSkeleton lines={2} />
      <SectionCardSkeleton lines={2} />
      <SectionCardSkeleton lines={2} />
      <SectionCardSkeleton lines={1} />
    </div>
  );
}
