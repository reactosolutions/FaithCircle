"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import { notifyActionResult } from "@/lib/notify";
import { updateMemberStatus } from "../actions";
import type { ProfileStatus } from "@/lib/database.types";

export function MemberStatusToggle({
  profileId,
  status,
}: {
  profileId: string;
  status: ProfileStatus;
}) {
  const t = useTranslations("Members");
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const next: ProfileStatus = current === "inactive" ? "active" : "inactive";
  const label = current === "inactive" ? t("reactivate") : t("deactivate");

  return (
    <div className="flex flex-col items-end gap-1">
      <Tooltip content={label}>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={label}
          className="rounded-full"
          disabled={pending}
          onClick={() => {
            const previous = current;
            setCurrent(next);
            setError(null);
            startTransition(async () => {
              const result = await updateMemberStatus({ profileId, status: next });
              if (!result.ok) {
                setCurrent(previous);
                setError(result.error);
              }
              notifyActionResult(result, next === "inactive" ? t("deactivatedToast") : t("reactivatedToast"));
            });
          }}
        >
          <Icon name={current === "inactive" ? "check_circle" : "block"} size={16} />
        </Button>
      </Tooltip>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
