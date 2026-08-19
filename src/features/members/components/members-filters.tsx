"use client";

import { useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_ROLES, PROFILE_STATUSES } from "../schema";
import { useRoleLabel } from "./role-badge";
import { useStatusLabel } from "./status-badge";

const ALL = "all";

export function MembersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTranslations("Members");
  const ROLE_LABEL = useRoleLabel();
  const STATUS_LABEL = useStatusLabel();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Any filter change invalidates whatever page we were on.
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const currentRole = searchParams.get("role") ?? ALL;
  const currentStatus = searchParams.get("status") ?? ALL;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder={t("searchPlaceholder")}
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => setParam("search", value || null), 400);
        }}
        className="sm:max-w-sm"
      />
      <div className="flex items-center gap-2">
        <Select
          value={currentRole}
          onValueChange={(next) => setParam("role", next && next !== ALL ? next : null)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>{currentRole === ALL ? t("allRoles") : ROLE_LABEL[currentRole as (typeof USER_ROLES)[number]]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allRoles")}</SelectItem>
            {USER_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABEL[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={currentStatus}
          onValueChange={(next) => setParam("status", next && next !== ALL ? next : null)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue>
              {currentStatus === ALL ? t("allStatuses") : STATUS_LABEL[currentStatus as (typeof PROFILE_STATUSES)[number]]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            {PROFILE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
