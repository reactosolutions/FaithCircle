import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { RolesAccordion } from "./roles-accordion";
import type { listPermissionMatrix } from "../queries";

function ScopeMark({
  scope,
  scopeLabel,
}: {
  scope: "own" | "circle" | "all" | undefined;
  scopeLabel: Record<"own" | "circle" | "all", string>;
}) {
  if (!scope) {
    return <Icon name="check" size={16} className="mx-auto text-transparent" />;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        scope === "all" ? "text-success" : "text-foreground",
      )}
    >
      <Icon name="check" size={14} className="shrink-0 text-success" />
      {scopeLabel[scope]}
    </span>
  );
}

// The read-only matrix from CLAUDE.md's Permissions section, rendered
// straight from permissions/role_permissions — this used to be a hardcoded
// list written before those tables existed; now it can't drift from what
// has_permission() actually enforces.
export async function RolesMatrix({
  matrix,
}: {
  matrix: Awaited<ReturnType<typeof listPermissionMatrix>>;
}) {
  const [t, tSettings] = await Promise.all([getTranslations("Roles"), getTranslations("Settings")]);
  const ROLE_COLUMNS = [
    { key: "admin", label: tSettings("matrixRoleAdmin") },
    { key: "administrative", label: tSettings("matrixRoleLeader") },
    { key: "student", label: tSettings("matrixRoleStudent") },
  ] as const;
  const SCOPE_LABEL: Record<"own" | "circle" | "all", string> = {
    own: tSettings("scopeOwn"),
    circle: tSettings("scopeCircle"),
    all: tSettings("scopeAll"),
  };

  return (
    <>
      {/* Below md: a per-role accordion, not the same table with columns
          shrunk — reading one role's capabilities at a time is what's
          actually useful at 360px. */}
      <RolesAccordion matrix={matrix} />

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs text-muted-foreground">
              <th className="pb-2 font-medium">{t("capabilityColumn")}</th>
              {ROLE_COLUMNS.map((column) => (
                <th key={column.key} className="pb-2 ps-3 text-center font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matrix.map((row) => (
              <tr key={row.key}>
                <td className="py-2.5 pe-3 text-foreground">{row.description ?? row.key}</td>
                {ROLE_COLUMNS.map((column) => (
                  <td key={column.key} className="py-2.5 ps-3 text-center">
                    <ScopeMark scope={row.scopes[column.key]} scopeLabel={SCOPE_LABEL} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
