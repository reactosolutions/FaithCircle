import { z } from "zod";

export const submitJoinRequestSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  fullName: z.string().trim().min(1, { error: "Enter your name." }),
});
