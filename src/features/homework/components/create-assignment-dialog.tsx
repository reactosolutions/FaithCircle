"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActionToast } from "@/hooks/use-action-toast";
import { useOnActionSuccess } from "@/hooks/use-on-action-success";
import { createAssignment } from "../actions";
import type { ActionResult } from "@/lib/action-result";
import type { QuestionType } from "@/lib/database.types";

export function CreateAssignmentDialog({ circles }: { circles: { id: string; name: string }[] }) {
  const t = useTranslations("Homework");
  const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
    text: t("questionTypeText"),
    multiple_choice: t("questionTypeMultipleChoice"),
  };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [circleId, setCircleId] = useState(circles.length === 1 ? circles[0].id : "");
  const [questionType, setQuestionType] = useState<QuestionType>("text");
  const [published, setPublished] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    createAssignment,
    undefined,
  );
  useActionToast(state, t("createdToast"));
  useOnActionSuccess(state, () => {
    setMobileOpen(false);
    setDesktopOpen(false);
    setQuestionType("text");
    setPublished(false);
  });

  if (circles.length === 0) return null;

  return (
    <ResponsiveDialog
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      desktopOpen={desktopOpen}
      onDesktopOpenChange={setDesktopOpen}
      triggerLabel={t("newAssignmentTrigger")}
      title={t("newAssignmentTitle")}
      description={t("newAssignmentDescription")}
    >
      <form action={formAction} className="flex flex-col gap-4">
        {circles.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="circleId">{t("circleLabel")}</Label>
            <input type="hidden" name="circleId" value={circleId} />
            <Select value={circleId} onValueChange={(next) => setCircleId(next ?? "")}>
              <SelectTrigger id="circleId" className="w-full">
                <SelectValue placeholder={t("chooseCirclePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {circles.map((circle) => (
                  <SelectItem key={circle.id} value={circle.id}>
                    {circle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {circles.length === 1 && <input type="hidden" name="circleId" value={circles[0].id} />}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">{t("titleLabel")}</Label>
          <Input id="title" name="title" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="instructions">{t("instructionsLabel")}</Label>
          <Textarea id="instructions" name="instructions" rows={3} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueAt">{t("dueDateLabel")}</Label>
            <Input id="dueAt" name="dueAt" type="datetime-local" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="points">{t("pointsLabel")}</Label>
            <Input id="points" name="points" type="number" min={0} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="questionType">{t("answerTypeLabel")}</Label>
          <input type="hidden" name="questionType" value={questionType} />
          <Select value={questionType} onValueChange={(next) => next && setQuestionType(next as QuestionType)}>
            <SelectTrigger id="questionType" className="w-full">
              <SelectValue>{QUESTION_TYPE_LABEL[questionType]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {QUESTION_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {questionType === "multiple_choice" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="choices">{t("choicesLabel")}</Label>
            <Textarea id="choices" name="choices" rows={4} placeholder={t("choicesPlaceholder")} />
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="published">{t("publishNowLabel")}</Label>
            <span className="text-xs text-muted-foreground">{t("publishNowHint")}</span>
          </div>
          <input type="hidden" name="published" value={published ? "true" : ""} />
          <Switch id="published" checked={published} onCheckedChange={setPublished} />
        </div>

        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="rounded-full">
          {pending ? t("creatingButton") : t("createButton")}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
