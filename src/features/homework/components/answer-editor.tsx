"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveDraft, submitAnswer } from "../actions";
import type { QuestionType, SubmissionStatus } from "@/lib/database.types";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AnswerEditor({
  assignmentId,
  initialAnswerText,
  status,
  feedback,
  score,
  points,
  questionType,
  choices,
}: {
  assignmentId: string;
  initialAnswerText: string;
  status: SubmissionStatus | null;
  feedback: string | null;
  score: number | null;
  points: number | null;
  questionType: QuestionType;
  choices: string[] | null;
}) {
  const t = useTranslations("Homework");
  const [answerText, setAnswerText] = useState(initialAnswerText);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialAnswerText);

  const locked = status === "submitted" || status === "reviewed";

  useEffect(() => {
    if (locked || answerText === lastSavedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(() => {
      saveDraft({ assignmentId, answerText }).then((result) => {
        if (result.ok) {
          lastSavedRef.current = answerText;
          setSaveState("saved");
        } else {
          setSaveState("error");
        }
      });
    }, 1200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answerText, assignmentId, locked]);

  if (locked) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t("yourAnswer")}</span>
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
            {answerText || "—"}
          </p>
        </div>
        {status === "submitted" && (
          <p className="text-sm text-muted-foreground">{t("submittedWaitingReview")}</p>
        )}
        {status === "reviewed" && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
            <span className="text-sm font-medium text-foreground">
              {t("scoreLabel", { score: score ?? "—" })}
              {points ? t("scoreOutOf", { points }) : ""}
            </span>
            {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {questionType === "multiple_choice" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
          {(choices ?? []).map((choice) => (
            <label
              key={choice}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted"
            >
              <input
                type="radio"
                name={`answer-${assignmentId}`}
                checked={answerText === choice}
                onChange={() => setAnswerText(choice)}
              />
              {choice}
            </label>
          ))}
        </div>
      ) : (
        <Textarea
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
          rows={8}
          placeholder={t("writeAnswerPlaceholder")}
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {saveState === "saving" && t("saving")}
          {saveState === "saved" && t("draftSaved")}
          {saveState === "error" && (
            <span className="text-destructive">{t("couldNotSaveDraft")}</span>
          )}
        </span>
        <Button
          type="button"
          disabled={submitting || answerText.trim().length === 0}
          className="rounded-full"
          onClick={() => {
            setSubmitError(null);
            setSubmitting(true);
            submitAnswer({ assignmentId, answerText }).then((result) => {
              setSubmitting(false);
              if (!result.ok) setSubmitError(result.error);
            });
          }}
        >
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </div>
      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
    </div>
  );
}
