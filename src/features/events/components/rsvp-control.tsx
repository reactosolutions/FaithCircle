"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { rsvpToEvent } from "../actions";
import { REASON_CATEGORIES } from "../schema";
import { notifyActionResult } from "@/lib/notify";
import type { AttendMode, EventFormat, ReasonCategory, RsvpResponse } from "@/lib/database.types";

export function RsvpControl({
  eventId,
  format,
  initialResponse,
  initialAttendMode,
  initialReasonCategory,
  initialReason,
}: {
  eventId: string;
  format: EventFormat;
  initialResponse: RsvpResponse;
  initialAttendMode: AttendMode | null;
  initialReasonCategory: ReasonCategory | null;
  initialReason: string | null;
}) {
  const t = useTranslations("Events");
  const RESPONSE_OPTIONS: { value: RsvpResponse; label: string }[] = [
    { value: "going", label: t("responseGoing") },
    { value: "tentative", label: t("responseTentative") },
    { value: "not_going", label: t("responseNotGoing") },
  ];
  const ATTEND_MODE_OPTIONS: { value: AttendMode; label: string }[] = [
    { value: "in_person", label: t("formatInPerson") },
    { value: "online", label: t("formatOnline") },
  ];
  const REASON_LABEL: Record<ReasonCategory, string> = {
    travel: t("reasonTravel"),
    illness: t("reasonIllness"),
    work: t("reasonWork"),
    family: t("reasonFamily"),
    distance: t("reasonDistance"),
    other: t("reasonOther"),
  };
  const [response, setResponse] = useState<RsvpResponse>(initialResponse);
  const [attendMode, setAttendMode] = useState<AttendMode | null>(
    initialAttendMode ?? (format !== "hybrid" ? (format === "online" ? "online" : "in_person") : null),
  );
  const [reasonCategory, setReasonCategory] = useState<ReasonCategory | null>(initialReasonCategory);
  const [reason, setReason] = useState(initialReason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Step 2 (attend mode) only exists for hybrid meetings — everywhere else
  // the mode is implied by the format. A reason is offered whenever it's
  // useful to the leader: declining outright, or going online instead of
  // in person on a hybrid meeting.
  const needsAttendModeStep = format === "hybrid" && response === "going";
  const showReason = response === "not_going" || (format === "hybrid" && attendMode === "online");

  function save(next: {
    response: RsvpResponse;
    attendMode: AttendMode | null;
    reasonCategory: ReasonCategory | null;
    reason: string;
  }) {
    setError(null);
    startTransition(async () => {
      const result = await rsvpToEvent(eventId, {
        response: next.response,
        attendMode: next.attendMode ?? undefined,
        reasonCategory: next.reasonCategory ?? undefined,
        reason: next.reason || undefined,
      });
      if (!result.ok) setError(result.error);
      // Optimistic: the button state already flipped before this call, so
      // only surface a toast on failure — success is visible instantly.
      notifyActionResult(result);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-fit gap-1 rounded-full border border-border p-1">
        {RESPONSE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={pending}
            onClick={() => {
              setResponse(option.value);
              if (option.value === "not_going") {
                save({ response: option.value, attendMode: null, reasonCategory, reason });
              } else if (option.value === "tentative") {
                // No attend-mode step, no reason — "maybe" doesn't commit
                // to either yet.
                setAttendMode(null);
                save({ response: option.value, attendMode: null, reasonCategory: null, reason: "" });
              } else if (format !== "hybrid") {
                const forced = format === "online" ? "online" : "in_person";
                setAttendMode(forced);
                save({ response: option.value, attendMode: forced, reasonCategory: null, reason: "" });
              }
              // Hybrid + going: wait for the attend-mode step before saving.
            }}
            className={cn(
              "min-h-11 rounded-full px-3 text-sm font-medium transition-colors sm:min-h-0 sm:py-1.5",
              response === option.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {needsAttendModeStep && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t("howAttending")}</span>
          <div className="inline-flex w-fit gap-1 rounded-full border border-border p-1">
            {ATTEND_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={pending}
                onClick={() => {
                  setAttendMode(option.value);
                  const nextReasonCategory = option.value === "in_person" ? null : reasonCategory;
                  if (option.value === "in_person") setReasonCategory(null);
                  save({
                    response: "going",
                    attendMode: option.value,
                    reasonCategory: nextReasonCategory,
                    reason: option.value === "in_person" ? "" : reason,
                  });
                }}
                className={cn(
                  "min-h-11 rounded-full px-3 text-sm font-medium transition-colors sm:min-h-0 sm:py-1.5",
                  attendMode === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showReason && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {response === "not_going" ? t("whyNotAttending") : t("whyOnlineInstead")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {REASON_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                disabled={pending}
                onClick={() => {
                  const next = reasonCategory === category ? null : category;
                  setReasonCategory(next);
                  save({ response, attendMode, reasonCategory: next, reason });
                }}
                className={cn(
                  "min-h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                  reasonCategory === category
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {REASON_LABEL[category]}
              </button>
            ))}
          </div>
          <Textarea
            rows={2}
            placeholder={t("addNotePlaceholder")}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => save({ response, attendMode, reasonCategory, reason })}
          />
        </div>
      )}

      {error && <span className="text-xs text-destructive">{error}</span>}
      {pending && <span className="text-xs text-muted-foreground">{t("saving")}</span>}
    </div>
  );
}
