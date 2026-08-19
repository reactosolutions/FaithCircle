"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { CheckboxList } from "@/components/ui/checkbox-list";
import { addCircleMembers, removeCircleMember } from "../actions";
import { notifyActionResult } from "@/lib/notify";

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
}

function AddMembersDialog({
  circleId,
  candidates,
}: {
  circleId: string;
  candidates: { id: string; full_name: string | null; email: string | null }[];
}) {
  const t = useTranslations("Circles");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await addCircleMembers({ circleId, memberIds: selectedIds });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      notifyActionResult(result, t("membersAddedToast"));
      setSelectedIds([]);
      setMobileOpen(false);
      setDesktopOpen(false);
    });
  }

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("addMembersTrigger")}
      title={t("addMembersTitle")}
      description={t("addMembersDescription")}
    >
      <div className="flex flex-col gap-3">
        <CheckboxList
          options={candidates.map((c) => ({ id: c.id, label: c.full_name ?? c.email ?? t("unnamed") }))}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((current) =>
              current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
            )
          }
          emptyLabel={t("noEligibleStudents")}
          maxHeightClassName="max-h-64"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="button"
          disabled={pending || selectedIds.length === 0}
          onClick={add}
          className="rounded-full"
        >
          {pending ? t("addingButton") : t("addButton", { count: selectedIds.length })}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

function MemberRow({
  circleId,
  member,
  canManage,
}: {
  circleId: string;
  member: Member;
  canManage: boolean;
}) {
  const t = useTranslations("Circles");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <Link href={`/members/${member.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {member.full_name ?? member.email ?? t("unnamed")}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email ?? "—"}</p>
      </Link>
      {canManage && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={t("removeAriaLabel", { name: member.full_name ?? t("unnamed") })}
          onClick={() =>
            startTransition(async () => {
              const result = await removeCircleMember({ circleId, profileId: member.id });
              notifyActionResult(result, t("removedToast"));
            })
          }
        >
          <Icon name="person_remove" size={18} />
        </Button>
      )}
    </div>
  );
}

export function CircleRoster({
  circleId,
  members,
  addCandidates,
  canManage = true,
}: {
  circleId: string;
  members: Member[];
  addCandidates: { id: string; full_name: string | null; email: string | null }[];
  // Read-only for a plain circle member (members.invite has no scope for
  // student) — the add/remove controls below only render for admin or the
  // circle's own leader, who both hold members.invite's 'circle' scope.
  canManage?: boolean;
}) {
  const t = useTranslations("Circles");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (member) =>
        (member.full_name ?? "").toLowerCase().includes(q) ||
        (member.email ?? "").toLowerCase().includes(q),
    );
  }, [members, search]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder={t("rosterSearchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        {canManage && <AddMembersDialog circleId={circleId} candidates={addCandidates} />}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {members.length === 0 ? t("noMembersYet") : t("noMembersMatchSearch")}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border px-3">
          {filtered.map((member) => (
            <MemberRow key={member.id} circleId={circleId} member={member} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}
