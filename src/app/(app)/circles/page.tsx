import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getViewerProfile } from "@/features/members/queries";
import {
  listAdvisorCandidates,
  listCirclesForProfile,
  listCirclesWithDetails,
  listStudentCandidates,
} from "@/features/circles/queries";
import { CreateCircleDialog } from "@/features/circles/components/create-circle-dialog";
import { CirclesList } from "@/features/circles/components/circles-list";
import { MyCirclesList } from "@/features/circles/components/my-circles-list";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function CirclesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Circles");
  const profile = await getViewerProfile();

  if (!profile) {
    redirect("/sign-in");
  }

  // Non-admin: a read-only "my circles" view scoped to circles this viewer
  // leads or belongs to — not the org-wide management page below, which is
  // admin-only (circles.create, and every circle's roster/advisors).
  if (profile.role !== "admin") {
    const circles = await listCirclesForProfile(profile.id);
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("count", { count: circles.length })} />
        <MyCirclesList circles={circles} />
      </div>
    );
  }

  const page = Math.max(1, Number(params.page) || 1);

  const [{ circles, total, pageSize }, advisorCandidates, studentCandidates] = await Promise.all([
    listCirclesWithDetails({ page }),
    listAdvisorCandidates(),
    listStudentCandidates(),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("count", { count: total })}
        action={
          <CreateCircleDialog advisorCandidates={advisorCandidates} studentCandidates={studentCandidates} />
        }
      />

      <CirclesList
        circles={circles}
        emptyAction={
          <CreateCircleDialog advisorCandidates={advisorCandidates} studentCandidates={studentCandidates} />
        }
      />

      <Pagination page={page} pageCount={pageCount} basePath="/circles" searchParams={{}} />
    </div>
  );
}
