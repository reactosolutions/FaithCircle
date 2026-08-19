import { z } from "zod";

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

// One choice per line in the create form's textarea, trimmed and blanks
// dropped — simpler than N separate add/remove inputs for what's usually a
// short list of options.
const choicesList = z.preprocess((value) => {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}, z.array(z.string()));

export const createAssignmentSchema = z
  .object({
    circleId: z.uuid(),
    title: z.string().trim().min(1, { error: "Enter a title." }),
    instructions: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    dueAt: z.preprocess(emptyToUndefined, z.string().optional()),
    points: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    published: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
    questionType: z.enum(["text", "multiple_choice"]),
    choices: choicesList,
  })
  .refine((data) => data.questionType !== "multiple_choice" || data.choices.length >= 2, {
    error: "Add at least two choices.",
    path: ["choices"],
  });

export const saveDraftSchema = z.object({
  assignmentId: z.uuid(),
  answerText: z.string(),
});

export const submitAnswerSchema = z.object({
  assignmentId: z.uuid(),
  answerText: z.string().trim().min(1, { error: "Write an answer before submitting." }),
});

export const reviewSubmissionSchema = z.object({
  submissionId: z.uuid(),
  feedback: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  score: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
});
