"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { addBlackoutDate, removeBlackoutDate } from "../actions";
import { notifyActionResult } from "@/lib/notify";

interface BlackoutRange {
  id: string;
  starts_on: string;
  ends_on: string;
}

export function BlackoutDates({ ranges }: { ranges: BlackoutRange[] }) {
  const t = useTranslations("Settings");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("blackoutDescription")}</p>

      {ranges.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {ranges.map((range) => (
            <li key={range.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                {format(new Date(`${range.starts_on}T00:00:00`), "MMM d, yyyy")} –{" "}
                {format(new Date(`${range.ends_on}T00:00:00`), "MMM d, yyyy")}
              </span>
              <button
                type="button"
                aria-label={t("removeAriaLabel")}
                className="flex size-11 items-center justify-center text-muted-foreground hover:text-destructive"
                onClick={() =>
                  startTransition(async () => {
                    const result = await removeBlackoutDate(range.id);
                    notifyActionResult(result);
                  })
                }
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blackoutStart" className="text-xs text-muted-foreground">
            {t("blackoutStartLabel")}
          </label>
          <Input
            id="blackoutStart"
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blackoutEnd" className="text-xs text-muted-foreground">
            {t("blackoutEndLabel")}
          </label>
          <Input
            id="blackoutEnd"
            type="date"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
            className="w-40"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className="rounded-full"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await addBlackoutDate({ startsOn, endsOn });
              if (!result.ok) {
                setError(result.error);
              } else {
                setStartsOn("");
                setEndsOn("");
              }
              notifyActionResult(result, t("blackoutAddedToast"));
            });
          }}
        >
          {t("addButton")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
