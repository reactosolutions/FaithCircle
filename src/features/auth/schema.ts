import { z } from "zod";

export const signInSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(8, { error: "Enter your password." }),
});

export type SignInInput = z.infer<typeof signInSchema>;

// Shared everywhere a NEW password is set — reset and complete-profile today,
// change-password and any future signup form later. Sign-in deliberately
// does NOT use this: a user's existing password shouldn't be re-validated
// against current complexity rules just to log in.
export const passwordSchema = z.string().min(8, { error: "Be at least 8 characters." });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
});

// A code-based alternative to clicking the confirmation/invite email link —
// same underlying account (admin-invited or a self-service /signup still
// finishing confirmation), just proved by typing a one-time code instead of
// following a URL. Never creates a new account from an email alone.
export const requestSignInCodeSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
});

export const verifySignInCodeSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  code: z.string().trim().min(6, { error: "Enter the 6-digit code." }).max(6, { error: "Enter the 6-digit code." }),
});

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const completeProfileSchema = z.object({
  phone: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  canHost: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(1, { error: "Enter your name." }),
    email: z.email({ error: "Enter a valid email address." }),
    password: passwordSchema,
    confirmPassword: z.string(),
    phone: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    inviteCode: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });
