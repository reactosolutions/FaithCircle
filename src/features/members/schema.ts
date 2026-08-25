import { z } from "zod";

export const USER_ROLES = ["admin", "administrative", "student"] as const;
export const PROFILE_STATUSES = ["invited", "active", "inactive", "pending"] as const;

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — e.g. a hidden input only rendered conditionally, like
// role-change-dialog's circleId/reassignLeaderId. Both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

// Promoting to administrative needs at least one circle in the same action
// (a leader with none has 'circle' scope over nothing and looks broken).
// Demoting FROM administrative needs an explicit choice for their existing
// circles — reassign to someone else, or knowingly leave them leaderless —
// never a silent default either way.
export const updateMemberRoleSchema = z.object({
  profileId: z.uuid(),
  role: z.enum(USER_ROLES),
  reason: z.string().trim().min(1, { error: "Explain why this role is changing." }),
  circleId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  reassignLeaderId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  leaveLeaderless: z.coerce.boolean().optional(),
});

export const updateMemberStatusSchema = z.object({
  profileId: z.uuid(),
  status: z.enum(PROFILE_STATUSES),
});

export const bulkUpdateMemberStatusSchema = z.object({
  profileIds: z.array(z.uuid()).min(1),
  status: z.enum(PROFILE_STATUSES),
});

export const inviteMemberSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  fullName: z.string().trim().min(1, { error: "Enter a name." }),
  role: z.enum(USER_ROLES),
  circleId: z.preprocess(emptyToUndefined, z.uuid().optional()),
});

export const updateMemberProfileSchema = z.object({
  profileId: z.uuid(),
  fullName: z.string().trim().min(1, { error: "Enter a name." }),
  phone: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const resetMemberPasswordSchema = z.object({
  profileId: z.uuid(),
});

export const cancelInvitationSchema = z.object({
  profileId: z.uuid(),
});

export const deleteMemberSchema = z.object({
  profileId: z.uuid(),
});

export const bulkDeleteMembersSchema = z.object({
  profileIds: z.array(z.uuid()).min(1),
});
