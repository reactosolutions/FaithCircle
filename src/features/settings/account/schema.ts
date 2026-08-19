import { z } from "zod";
import { passwordSchema } from "@/features/auth/schema";

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const updateAccountSchema = z.object({
  fullName: z.string().trim().min(1, { error: "Enter your name." }),
  phone: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Enter your current password." }).optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });

// No currentPassword field — reaching /change-password at all already
// requires an active session signed in with the temp password, so asking
// for it again immediately after is redundant, unlike changePasswordSchema
// (settings, where re-proving the current password guards against a
// session left open on a shared device).
export const requiredPasswordChangeSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });
