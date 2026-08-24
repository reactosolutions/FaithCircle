import { DetailHeroSkeleton } from "@/components/app-shell/page-skeletons";

export default function AttendanceSheetLoading() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <DetailHeroSkeleton lines={6} />
    </div>
  );
}
