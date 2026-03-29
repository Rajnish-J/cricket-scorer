import { z } from "zod";

export const ScorerInputSchema = z.object({
  batterName: z.string().trim().min(1, "Batter name is required"),
  runs: z.number().int().min(0, "Runs must be 0 or more").max(6, "Runs cannot exceed 6"),
  wicket: z.boolean().default(false),
  over: z.number().min(0, "Over cannot be negative"),
});

export type ScorerInput = z.infer<typeof ScorerInputSchema>;
