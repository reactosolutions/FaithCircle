import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/database.types";

// Reuses the Nav namespace's role labels (nav header role pill and every
// members-feature consumer of "what do we call this role" share the exact
// same three words) rather than duplicating them under Members too.
export function useRoleLabel(): Record<UserRole, string> {
  const t = useTranslations("Nav");
  return {
    admin: t("roleAdmin"),
    administrative: t("roleAdministrative"),
    student: t("roleStudent"),
  };
}

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  administrative: "secondary",
  student: "outline",
};

export function RoleBadge({ role }: { role: UserRole }) {
  const ROLE_LABEL = useRoleLabel();
  return <Badge variant={ROLE_VARIANT[role]}>{ROLE_LABEL[role]}</Badge>;
}
