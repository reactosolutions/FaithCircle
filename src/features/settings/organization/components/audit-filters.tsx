"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TABLES = [
  "profiles",
  "circles",
  "circle_members",
  "events",
  "event_circles",
  "event_invitees",
  "event_rsvps",
  "attendance",
  "assignments",
  "submissions",
  "notifications",
] as const;

const ACTIONS = ["insert", "update", "delete", "data_export"] as const;

export function AuditFilters({
  actors,
  from,
  to,
  actorId,
  tableName,
  action,
  recordId,
}: {
  actors: { id: string; label: string }[];
  from?: string;
  to?: string;
  actorId?: string;
  tableName?: string;
  action?: string;
  recordId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Settings");

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auditFrom">{t("fromLabel")}</Label>
        <Input
          id="auditFrom"
          type="date"
          defaultValue={from ?? ""}
          onChange={(event) => setParam("from", event.target.value || null)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auditTo">{t("toLabel")}</Label>
        <Input
          id="auditTo"
          type="date"
          defaultValue={to ?? ""}
          onChange={(event) => setParam("to", event.target.value || null)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auditRecordId">{t("recordIdLabel")}</Label>
        <Input
          id="auditRecordId"
          placeholder={t("recordIdPlaceholder")}
          defaultValue={recordId ?? ""}
          onChange={(event) => setParam("recordId", event.target.value || null)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auditActor">{t("actorLabel")}</Label>
        <Select value={actorId ?? "all"} onValueChange={(v) => setParam("actorId", v === "all" ? null : v)}>
          <SelectTrigger id="auditActor" className="w-full">
            <SelectValue>{actors.find((a) => a.id === actorId)?.label ?? t("allActors")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allActors")}</SelectItem>
            {actors.map((actor) => (
              <SelectItem key={actor.id} value={actor.id}>
                {actor.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auditTable">{t("tableLabel")}</Label>
        <Select value={tableName ?? "all"} onValueChange={(v) => setParam("tableName", v === "all" ? null : v)}>
          <SelectTrigger id="auditTable" className="w-full">
            <SelectValue>{tableName ?? t("allTables")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTables")}</SelectItem>
            {TABLES.map((table) => (
              <SelectItem key={table} value={table}>
                {table}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auditAction">{t("actionLabel")}</Label>
        <Select value={action ?? "all"} onValueChange={(v) => setParam("action", v === "all" ? null : v)}>
          <SelectTrigger id="auditAction" className="w-full">
            <SelectValue>{action ?? t("allActions")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allActions")}</SelectItem>
            {ACTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
