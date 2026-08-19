"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmissionStatusBadge } from "./submission-status-badge";
import { reviewSubmission } from "../actions";
import { notifyActionResult } from "@/lib/notify";
import type { SubmissionStatus } from "@/lib/database.types";

interface QueueRow {
  id: string;
  memberName: string;
  status: SubmissionStatus;
  answerText: string | null;
  feedback: string | null;
  score: number | null;
}

function ReviewRow({ row, points }: { row: QueueRow; points: number | null }) {
  const t = useTranslations("Homework");
  const [feedback, setFeedback] = useState(row.feedback ?? "");
  const [score, setScore] = useState(row.score !== null ? String(row.score) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{row.memberName}</span>
        <SubmissionStatusBadge status={row.status} />
      </div>
      {row.answerText ? (
        <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
          {row.answerText}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noAnswerSubmitted")}</p>
      )}
      {row.status !== "draft" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <Textarea
            placeholder={t("feedbackPlaceholder")}
            value={feedback}
            onChange={(event) => {
              setFeedback(event.target.value);
              setSaved(false);
            }}
            rows={2}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={points ?? undefined}
              placeholder={t("scorePlaceholder")}
              value={score}
              onChange={(event) => {
                setScore(event.target.value);
                setSaved(false);
              }}
              className="w-20"
            />
            <Button
              type="button"
              size="sm"
              disabled={pending}
              className="rounded-full"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await reviewSubmission({
                    submissionId: row.id,
                    feedback,
                    score,
                  });
                  if (!result.ok) setError(result.error);
                  else setSaved(true);
                  notifyActionResult(result, t("reviewSavedToast"));
                });
              }}
            >
              {pending ? t("saving") : t("saveReview")}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && !error && <p className="text-xs text-success">{t("reviewSavedToast")}</p>}
    </div>
  );
}

export function ReviewQueue({ rows, points }: { rows: QueueRow[]; points: number | null }) {
  const t = useTranslations("Homework");
  if (rows.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">{t("noOneStartedYet")}</p>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-border">
      {rows.map((row) => (
        <ReviewRow key={row.id} row={row} points={points} />
      ))}
    </div>
  );
}
