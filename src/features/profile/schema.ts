import { z } from "zod";

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const updateOwnProfileSchema = z.object({
  fullName: z.string().trim().min(1, { error: "Enter your name." }),
  phone: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  canHost: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  homeAddress: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  hostCapacity: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
});
