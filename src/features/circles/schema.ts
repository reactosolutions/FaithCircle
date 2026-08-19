import { z } from "zod";

// Accepts either a comma-separated hidden-input string (same pattern as
// ScheduleEventDialog's extraCircleIds/inviteeIds, parsed from FormData by
// createCircleSchema's <form action>) or an actual string[] (addCircleMembers,
// updateCircleAdvisors, and AssignCirclesDialog call their actions directly
// with a real array, not through FormData) — without the array branch, an
// array value fell through to the "not a string" case and silently became
// [], which made every direct call always submit an empty list.
const idList = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}, z.array(z.uuid()));

// Membership at creation time is one or the other, not both: either the
// admin hand-picks students to add now, or the circle starts empty with a
// join code people use to add themselves later (see CircleInviteForm for
// the same open_invite/approval_required mechanism, reused here instead of
// re-implemented). Advisors are optional too — a circle can be created
// leaderless and assigned an advisor later from Members > promote to
// administrative.
export const createCircleSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Enter a circle name." }),
    advisorIds: idList,
    membershipMode: z.enum(["students", "code"]),
    memberIds: idList,
  })
  .transform((data) => ({ ...data, generateInviteCode: data.membershipMode === "code" }));

export const updateCircleAdvisorsSchema = z.object({
  circleId: z.uuid(),
  advisorIds: idList,
});

export const addCircleMembersSchema = z
  .object({
    circleId: z.uuid(),
    memberIds: idList,
  })
  .refine((data) => data.memberIds.length > 0, {
    error: "Pick at least one person to add.",
    path: ["memberIds"],
  });

export const removeCircleMemberSchema = z.object({
  circleId: z.uuid(),
  profileId: z.uuid(),
});
