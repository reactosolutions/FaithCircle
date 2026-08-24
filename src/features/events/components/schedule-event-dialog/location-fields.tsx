"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HostCandidate } from "./constants";

// Host/address/capacity — shown whenever the meeting has an in-person
// component (format !== "online").
export function LocationFields({
  hosts,
  hostId,
  onHostIdChange,
  address,
  onAddressChange,
  defaultInPersonCapacity,
}: {
  hosts: HostCandidate[];
  hostId: string;
  onHostIdChange: (hostId: string) => void;
  address: string;
  onAddressChange: (address: string) => void;
  // Pre-fills the capacity field when editing an existing event — omitted
  // (and left to the placeholder-driven default) when scheduling a new one.
  defaultInPersonCapacity?: number | null;
}) {
  const t = useTranslations("Events");
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hostId">{t("hostLabel")}</Label>
        <input type="hidden" name="hostId" value={hostId} />
        <Select
          value={hostId}
          onValueChange={(next) => {
            onHostIdChange(next ?? "");
            if (next) {
              const host = hosts.find((h) => h.id === next);
              onAddressChange(host?.home_address ?? "");
            }
          }}
        >
          <SelectTrigger id="hostId" className="w-full">
            <SelectValue placeholder={hosts.length === 0 ? t("noHostsAvailable") : t("pickHost")} />
          </SelectTrigger>
          <SelectContent>
            {hosts.map((host) => (
              <SelectItem key={host.id} value={host.id}>
                {host.full_name ?? t("unnamed")}
                {host.host_capacity ? t("fitsCapacity", { capacity: host.host_capacity }) : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">{t("addressLabel")}</Label>
        <Input
          id="address"
          name="address"
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          placeholder={t("addressPlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inPersonCapacity">{t("capacityLabel")}</Label>
        <Input
          id="inPersonCapacity"
          name="inPersonCapacity"
          type="number"
          min={1}
          defaultValue={defaultInPersonCapacity ?? undefined}
          placeholder={
            hostId
              ? (hosts.find((h) => h.id === hostId)?.host_capacity?.toString() ?? t("capacityOptional"))
              : t("capacityDefaultsFromHost")
          }
        />
      </div>
    </>
  );
}
