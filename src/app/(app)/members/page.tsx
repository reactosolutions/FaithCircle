import { getTranslations } from "next-intl/server";
import { listMembers, getViewerProfile, getPhonesByIds } from "@/features/members/queries";
import { listViewerCircles } from "@/features/events/queries";
import { MembersFilters } from "@/features/members/components/members-filters";
import { InviteDialog } from "@/features/members/components/invite-dialog";
import { MembersTable } from "@/features/members/components/members-table";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/app-shell/page-header";
import type { ProfileStatus, UserRole } from "@/lib/database.types";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Members");
  const viewer = await getViewerProfile();
  const isAdmin = viewer?.role === "admin";
  const isAdministrative = viewer?.role === "administrative";
  const canAddMembers = isAdmin || isAdministrative;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ members, total, pageSize }, circles] = await Promise.all([
    listMembers({
      search: params.search,
      role: params.role as UserRole | undefined,
      status: params.status as ProfileStatus | undefined,
      page,
    }),
    canAddMembers ? listViewerCircles() : Promise.resolve([]),
  ]);
  // Neither depends on the other (one needs isAdmin, the other needs
  // `members` — already resolved above) — one parallel round trip instead
  // of two sequential ones.
  const [administrativeCandidates, phoneById] = isAdmin
    ? await Promise.all([
        listMembers({ role: "administrative", pageSize: 200 }).then((result) =>
          result.members.map((m) => ({ id: m.id, full_name: m.full_name })),
        ),
        getPhonesByIds(members.map((m) => m.id)),
      ])
    : [[], {}];
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("count", { count: total })}
        action={
          canAddMembers && (
            <InviteDialog viewerRole={isAdmin ? "admin" : "administrative"} circles={circles} />
          )
        }
      />

      <MembersFilters />

      <MembersTable
        members={members}
        isAdmin={isAdmin}
        circles={circles}
        administrativeCandidates={administrativeCandidates}
        phoneById={phoneById}
      />

      <Pagination
        page={page}
        pageCount={pageCount}
        basePath="/members"
        searchParams={{ search: params.search, role: params.role, status: params.status }}
      />
    </div>
  );
}
