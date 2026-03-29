import { z } from "zod";

export const PlayerRoleSchema = z.enum([
  "batter",
  "bowler",
  "all-rounder",
  "wicket-keeper",
]);

export const TeamCreateSchema = z.object({
  name: z.string().trim().min(2, "Team name is required"),
  shortName: z.string().trim().min(2).max(4),
  players: z
    .array(
      z.object({
        name: z.string().trim().min(2),
        role: PlayerRoleSchema,
      })
    )
    .min(2, "At least 2 players are required")
    .max(30, "At most 30 players are allowed"),
});

export const MatchCreateSchema = z.object({
  format: z.enum(["T10", "T20", "ODI", "TEST", "CUSTOM"]),
  overs: z.number().int().min(1).max(450),
  venue: z.string().trim().min(2).max(100),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  tossWinnerTeamId: z.string().min(1),
  tossDecision: z.enum(["bat", "bowl"]),
  openingStrikerId: z.string().min(1),
  openingNonStrikerId: z.string().min(1),
  openingBowlerId: z.string().min(1),
});

export const ScoreEventSchema = z.object({
  runsOffBat: z.number().int().min(0).max(6),
  extraRuns: z.number().int().min(0).max(6),
  extraType: z.enum(["none", "wide", "no-ball", "bye", "leg-bye"]),
  isWicket: z.boolean().default(false),
  wicketType: z
    .enum([
      "bowled",
      "caught",
      "lbw",
      "run-out",
      "stumped",
      "hit-wicket",
      "retired-out",
    ])
    .nullable()
    .optional(),
  nextBatterId: z.string().optional(),
  nextBowlerId: z.string().optional(),
});

export type TeamCreateInput = z.infer<typeof TeamCreateSchema>;
export type MatchCreateInput = z.infer<typeof MatchCreateSchema>;
export type ScoreEventInput = z.infer<typeof ScoreEventSchema>;

