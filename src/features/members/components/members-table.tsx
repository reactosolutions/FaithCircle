"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StaggerItem } from "@/components/ui/stagger-item";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { RoleChangeDialog } from "./role-change-dialog";
import { MemberStatusToggle } from "./member-status-toggle";
import { EditMemberDialog } from "./edit-member-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { CancelInvitationDialog } from "./cancel-invitation-dialog";
import { DeleteMemberDialog } from "./delete-member-dialog";
import { MembersBulkToolbar } from "./members-bulk-toolbar";
import { MemberMobileRow } from "./member-mobile-row";
import { RoleBadge } from "./role-badge";
import { StatusBadge } from "./status-badge";
import { CanHostIndicator } from "./can-host-indicator";
import type { ProfileStatus, UserRole } from "@/lib/database.types";

export interface MemberRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  status: ProfileStatus;
  can_host: boolean;
}

// Table at md+, stacked cards below — per CLAUDE.md's responsive rule for
// data tables ("never allow horizontal scroll"). Both branches render from
// the same `members` array so there's one source of truth for row content;
// only the markup shape differs.
//
// Row-selection state (for the bulk toolbar: approve/reject pending
// signups, deactivate/reactivate) lives here rather than in a parent
// Server Component, which is what makes this a Client Component now —
// selection is admin-only, matching settings.organization/
// members.deactivate both being admin-only in the Permissions matrix, so
// non-admin viewers never see checkboxes at all.
export function MembersTable({
  members,
  isAdmin,
  circles,
  administrativeCandidates,
  phoneById,
}: {
  members: MemberRow[];
  isAdmin: boolean;
  circles: { id: string; name: string }[];
  administrativeCandidates: { id: string; full_name: string | null }[];
  phoneById: Record<string, string | null>;
}) {
  const t = useTranslations("Members");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const allSelected = members.length > 0 && selectedIds.length === members.length;

  function toggleAll() {
    setSelectedIds(allSelected ? [] : members.map((m) => m.id));
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon="search_off" title={t("noMembersMatch")} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {isAdmin && selectedIds.length > 0 && (
        <MembersBulkToolbar
          selectedIds={selectedIds}
          circles={circles}
          onDone={() => setSelectedIds([])}
        />
      )}

      {/* Desktop (md+): a list/card toggle over the same `members` array —
          below md there's only ever the one compact row layout, so the
          toggle itself is hidden there too. */}
      <div className="hidden items-center justify-end md:flex">
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === "list" ? (
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-11">
                  <input
                    type="checkbox"
                    aria-label={t("selectAllAriaLabel")}
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </TableHead>
              )}
              <TableHead>{t("colName")}</TableHead>
              <TableHead>{t("colRole")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              {isAdmin && <TableHead className="text-end">{t("colActions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, index) => (
              <StaggerItem
                key={member.id}
                index={index}
                as="tr"
                className="border-b border-border transition-colors hover:bg-muted/40"
              >
                {isAdmin && (
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={member.full_name || member.email || t("unnamed")}
                      checked={selectedIds.includes(member.id)}
                      onChange={() => toggle(member.id)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link href={`/members/${member.id}`} className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-medium text-foreground">
                      {member.full_name || member.email || t("unnamed")}
                    </span>
                    <span className="text-xs break-all text-muted-foreground">{member.email}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={member.role} />
                    <CanHostIndicator canHost={member.can_host} />
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={member.status} />
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <EditMemberDialog
                        profileId={member.id}
                        fullName={member.full_name}
                        phone={phoneById[member.id] ?? null}
                      />
                      <RoleChangeDialog
                        profileId={member.id}
                        memberName={member.full_name || member.email || t("defaultMemberName")}
                        currentRole={member.role}
                        circles={circles}
                        administrativeCandidates={administrativeCandidates}
                      />
                      <ResetPasswordDialog profileId={member.id} email={member.email ?? ""} />
                      {member.status === "invited" ? (
                        <CancelInvitationDialog
                          profileId={member.id}
                          memberName={member.full_name || member.email || t("defaultMemberName")}
                        />
                      ) : (
                        <>
                          <MemberStatusToggle profileId={member.id} status={member.status} />
                          <DeleteMemberDialog
                            profileId={member.id}
                            memberName={member.full_name || member.email || t("defaultMemberName")}
                          />
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
              </StaggerItem>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="hidden grid-cols-2 gap-3 md:grid lg:grid-cols-3">
          {members.map((member, index) => (
            <StaggerItem key={member.id} index={index}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3 py-4">
                  <div className="flex items-start gap-3">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        className="mt-1"
                        aria-label={member.full_name || member.email || t("unnamed")}
                        checked={selectedIds.includes(member.id)}
                        onChange={() => toggle(member.id)}
                      />
                    )}
                    <Link href={`/members/${member.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-medium text-foreground">
                        {member.full_name || member.email || t("unnamed")}
                      </span>
                      <span className="text-xs break-all text-muted-foreground">{member.email}</span>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <RoleBadge role={member.role} />
                        <StatusBadge status={member.status} />
                        <CanHostIndicator canHost={member.can_host} />
                      </div>
                    </Link>
                  </div>
                  {isAdmin && (
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <EditMemberDialog
                        profileId={member.id}
                        fullName={member.full_name}
                        phone={phoneById[member.id] ?? null}
                      />
                      <RoleChangeDialog
                        profileId={member.id}
                        memberName={member.full_name || member.email || t("defaultMemberName")}
                        currentRole={member.role}
                        circles={circles}
                        administrativeCandidates={administrativeCandidates}
                      />
                      <ResetPasswordDialog profileId={member.id} email={member.email ?? ""} />
                      {member.status === "invited" ? (
                        <CancelInvitationDialog
                          profileId={member.id}
                          memberName={member.full_name || member.email || t("defaultMemberName")}
                        />
                      ) : (
                        <>
                          <MemberStatusToggle profileId={member.id} status={member.status} />
                          <DeleteMemberDialog
                            profileId={member.id}
                            memberName={member.full_name || member.email || t("defaultMemberName")}
                          />
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </div>
      )}

      {/* Phone (<md): always the compact one-row-per-member list, regardless
          of the desktop view toggle above — there's no room for a card grid
          at 360px, and a table would force horizontal scroll. */}
      <Card className="md:hidden">
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {members.map((member, index) => (
            <StaggerItem key={member.id} index={index}>
              <MemberMobileRow
                member={member}
                isAdmin={isAdmin}
                selected={selectedIds.includes(member.id)}
                onToggleSelect={() => toggle(member.id)}
                circles={circles}
                administrativeCandidates={administrativeCandidates}
                phone={phoneById[member.id] ?? null}
              />
            </StaggerItem>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
