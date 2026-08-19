import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import {
  listAdvisorCandidates,
  listCirclesWithDetails,
  listStudentCandidates,
} from "@/features/circles/queries";
import { CreateCircleDialog } from "@/features/circles/components/create-circle-dialog";
import { CirclesList } from "@/features/circles/components/circles-list";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function CirclesPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  const t = await getTranslations("Circles");
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  if (profile?.role !== "admin") {
    notFound();
  }

  const [circles, advisorCandidates, studentCandidates] = await Promise.all([
    listCirclesWithDetails(),
    listAdvisorCandidates(),
    listStudentCandidates(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("count", { count: circles.length })}
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
    </div>
  );
}
