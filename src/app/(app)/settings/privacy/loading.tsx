import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/app-shell/page-skeletons";

export default function PrivacySettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <SectionCardSkeleton lines={3} />
    </div>
  );
}
