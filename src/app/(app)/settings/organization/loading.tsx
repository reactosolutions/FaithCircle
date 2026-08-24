import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/app-shell/page-skeletons";

export default function OrganizationSettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <SectionCardSkeleton lines={3} />
      <SectionCardSkeleton lines={2} />
      <SectionCardSkeleton lines={2} withTitle />
      <SectionCardSkeleton lines={1} />
      <SectionCardSkeleton lines={1} />
    </div>
  );
}
