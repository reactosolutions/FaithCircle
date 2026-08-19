"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import type { listPermissionMatrix } from "../queries";

type Role = "admin" | "administrative" | "student";
type Scope = "own" | "circle" | "all";

// Below md, the matrix flips from "one row per permission, one column per
// role" to "one section per role" — a permission-per-row table read
// role-by-role at 360px would mean scanning three mostly-empty columns per
// row; an accordion per role means each expanded section is only the
// capabilities that role actually has.
export function RolesAccordion({
  matrix,
}: {
  matrix: Awaited<ReturnType<typeof listPermissionMatrix>>;
}) {
  const t = useTranslations("Settings");
  const ROLES: { key: Role; label: string }[] = [
    { key: "admin", label: t("matrixRoleAdmin") },
    { key: "administrative", label: t("matrixRoleLeader") },
    { key: "student", label: t("matrixRoleStudent") },
  ];
  const SCOPE_LABEL: Record<Scope, string> = {
    own: t("scopeOwn"),
    circle: t("scopeCircle"),
    all: t("scopeAll"),
  };
  const [openRole, setOpenRole] = useState<Role>("admin");

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border md:hidden">
      {ROLES.map((role) => {
        const capabilities = matrix.filter((row) => row.scopes[role.key]);
        const isOpen = openRole === role.key;
        return (
          <div key={role.key}>
            <button
              type="button"
              onClick={() => setOpenRole(isOpen ? ("" as Role) : role.key)}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-start"
            >
              <span className="text-sm font-medium text-foreground">{role.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("capabilitiesCount", { count: capabilities.length })}
                </span>
                <Icon
                  name="expand_more"
                  size={16}
                  className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")}
                />
              </span>
            </button>
            {isOpen && (
              <div className="flex flex-col divide-y divide-border border-t border-border bg-muted/30">
                {capabilities.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">{t("noPermissions")}</p>
                )}
                {capabilities.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-foreground">{row.description ?? row.key}</span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {SCOPE_LABEL[row.scopes[role.key] as Scope]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
