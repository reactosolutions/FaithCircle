import { z } from "zod";

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const updateHostingSchema = z.object({
  canHost: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  homeAddress: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  homeMapsUrl: z.preprocess(emptyToUndefined, z.url().optional()),
  hostCapacity: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  homeArrivalNotes: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const addBlackoutDateSchema = z
  .object({
    startsOn: z.string().min(1, { error: "Pick a start date." }),
    endsOn: z.string().min(1, { error: "Pick an end date." }),
  })
  .refine((data) => data.endsOn >= data.startsOn, {
    error: "End date must be on or after the start date.",
    path: ["endsOn"],
  });
