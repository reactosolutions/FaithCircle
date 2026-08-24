import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/app-shell/page-skeletons";

export default function PreferencesSettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <SectionCardSkeleton lines={4} />
    </div>
  );
}
