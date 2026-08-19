"use server";

import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { notifyUsers } from "@/lib/notifications";
import type { ActionResult } from "@/lib/action-result";
import {
  createAssignmentSchema,
  reviewSubmissionSchema,
  saveDraftSchema,
  submitAnswerSchema,
} from "./schema";

export async function createAssignment(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createAssignmentSchema.safeParse({
    circleId: formData.get("circleId"),
    title: formData.get("title"),
    instructions: formData.get("instructions"),
    dueAt: formData.get("dueAt"),
    points: formData.get("points"),
    published: formData.get("published"),
    questionType: formData.get("questionType"),
    choices: formData.get("choices"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("assignments.create", { circleId: parsed.data.circleId });
  if (!actor.ok) return actor;

  const { data: assignment, error } = await actor.supabase
    .from("assignments")
    .insert({
      circle_id: parsed.data.circleId,
      title: parsed.data.title,
      instructions: parsed.data.instructions ?? null,
      due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null,
      points: parsed.data.points ?? null,
      published: parsed.data.published,
      created_by: actor.userId,
      question_type: parsed.data.questionType,
      choices: parsed.data.questionType === "multiple_choice" ? parsed.data.choices : null,
    })
    .select("id")
    .single();

  if (error || !assignment) {
    return { ok: false, error: "Could not create the assignment." };
  }

  if (parsed.data.published) {
    const { data: memberRows } = await actor.supabase
      .from("circle_members")
      .select("profile_id")
      .eq("circle_id", parsed.data.circleId);
    await notifyUsers(
      (memberRows ?? []).map((row) => row.profile_id),
      "new_assignment",
      { assignmentId: assignment.id, assignmentTitle: parsed.data.title },
      actor.userId,
    );
  }

  refresh();
  return { ok: true };
}

// Autosave — deliberately doesn't call refresh(). It fires on every debounce
// tick while someone is typing; forcing a server-cache refresh that often
// would be wasted work for a value the client already reflects locally.
export async function saveDraft(input: unknown): Promise<ActionResult> {
  const parsed = saveDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const actor = await requirePermission("submissions.create", { profileId: user.id });
  if (!actor.ok) return actor;

  const { error } = await supabase.from("submissions").upsert(
    {
      assignment_id: parsed.data.assignmentId,
      profile_id: user.id,
      answer_text: parsed.data.answerText,
      status: "draft",
    },
    { onConflict: "assignment_id,profile_id" },
  );

  if (error) {
    return { ok: false, error: "Could not save your draft." };
  }

  return { ok: true };
}

export async function submitAnswer(input: unknown): Promise<ActionResult> {
  const parsed = submitAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const actor = await requirePermission("submissions.create", { profileId: user.id });
  if (!actor.ok) return actor;

  // A multiple-choice answer must be one of the assignment's own choices —
  // checked here rather than in the schema, since that needs a DB lookup a
  // sync Zod refine can't do. Free-text assignments skip this entirely.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("question_type, choices")
    .eq("id", parsed.data.assignmentId)
    .single();
  if (
    assignment?.question_type === "multiple_choice" &&
    !(assignment.choices ?? []).includes(parsed.data.answerText)
  ) {
    return { ok: false, error: "Pick one of the listed choices." };
  }

  const { error } = await supabase.from("submissions").upsert(
    {
      assignment_id: parsed.data.assignmentId,
      profile_id: user.id,
      answer_text: parsed.data.answerText,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,profile_id" },
  );

  if (error) {
    return { ok: false, error: "Could not submit your answer." };
  }

  refresh();
  return { ok: true };
}

export async function reviewSubmission(input: unknown): Promise<ActionResult> {
  const parsed = reviewSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const lookupClient = await createClient();
  const { data: submission } = await lookupClient
    .from("submissions")
    .select("assignment_id, profile_id")
    .eq("id", parsed.data.submissionId)
    .single();
  if (!submission) {
    return { ok: false, error: "Submission not found." };
  }

  const { data: assignment } = await lookupClient
    .from("assignments")
    .select("circle_id, title")
    .eq("id", submission.assignment_id)
    .single();
  if (!assignment) {
    return { ok: false, error: "Submission not found." };
  }

  const actor = await requirePermission("submissions.review", { circleId: assignment.circle_id });
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("submissions")
    .update({
      feedback: parsed.data.feedback ?? null,
      score: parsed.data.score ?? null,
      status: "reviewed",
      reviewer_id: actor.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.submissionId);

  if (error) {
    return { ok: false, error: "Could not save the review." };
  }

  await notifyUsers(
    [submission.profile_id],
    "feedback_received",
    { assignmentId: submission.assignment_id, assignmentTitle: assignment.title },
    actor.userId,
  );

  refresh();
  return { ok: true };
}
