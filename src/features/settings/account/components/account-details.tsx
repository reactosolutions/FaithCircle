import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { IconCircle } from "@/components/ui/icon-circle";
import { RoleBadge } from "@/features/members/components/role-badge";
import { StatusBadge } from "@/features/members/components/status-badge";
import type { ProfileStatus, UserRole } from "@/lib/database.types";

// The page's hero element (CLAUDE.md's Hierarchy pass, #1) — a read-only
// summary, not a form. Email lives here as plain text specifically because
// it's no longer editable: self-service email changes were removed, so
// there's nothing left for a Card titled "Email" to contain but this.
export function AccountDetails({
  fullName,
  email,
  phone,
  role,
  status,
  memberSince,
}: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: ProfileStatus;
  memberSince: string;
}) {
  const t = useTranslations("Settings");
  const initials = (fullName || email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <IconCircle tone="primary" size="xl" className="font-heading text-xl font-semibold">
        {initials}
      </IconCircle>
      <div className="flex flex-1 flex-col gap-3">
        <div>
          <p className="font-heading text-lg font-semibold text-foreground">
            {fullName || t("unnamed")}
          </p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={role} />
          <StatusBadge status={status} />
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">{t("phoneDetailLabel")}</dt>
            <dd className="text-foreground">{phone || t("phoneNotSet")}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">{t("memberSinceLabel")}</dt>
            <dd className="text-foreground">{format(new Date(memberSince), "MMM d, yyyy")}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
