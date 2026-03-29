import { z } from "zod";

export const MatchFormatSchema = z.enum(["T10", "T20", "ODI", "TEST", "CUSTOM"]);
export const MatchStatusSchema = z.enum(["scheduled", "live", "completed"]);
export const ExtraTypeSchema = z.enum(["none", "wide", "no-ball", "bye", "leg-bye"]);
export const WicketTypeSchema = z.enum([
  "bowled",
  "caught",
  "lbw",
  "run-out",
  "stumped",
  "hit-wicket",
  "retired-out",
]);
export const TossDecisionSchema = z.enum(["bat", "bowl"]);
export const PlayerRoleSchema = z.enum([
  "batter",
  "bowler",
  "all-rounder",
  "wicket-keeper",
]);

export const PlayerSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(2),
    role: PlayerRoleSchema,
  })
  .strict();

export const TeamSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(2),
    shortName: z.string().trim().min(2).max(6),
    players: z.array(PlayerSchema),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const BallEventSchema = z
  .object({
    id: z.string().min(1),
    inningsNumber: z.union([z.literal(1), z.literal(2)]),
    over: z.number().int().min(0),
    ballInOver: z.number().int().min(1).max(6),
    runsOffBat: z.number().int().min(0).max(6),
    extraRuns: z.number().int().min(0).max(6),
    extraType: ExtraTypeSchema,
    isWicket: z.boolean(),
    wicketType: WicketTypeSchema.nullable(),
    strikerId: z.string().min(1),
    nonStrikerId: z.string().min(1),
    bowlerId: z.string().min(1),
    totalRuns: z.number().int().min(0).max(12),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const InningsStateSchema = z
  .object({
    battingTeamId: z.string().min(1),
    bowlingTeamId: z.string().min(1),
    oversLimit: z.number().int().min(1).max(450),
    runs: z.number().int().min(0),
    wickets: z.number().int().min(0),
    legalBalls: z.number().int().min(0),
    completed: z.boolean(),
    strikerId: z.string().min(1),
    nonStrikerId: z.string().min(1),
    currentBowlerId: z.string().min(1),
    yetToBatIds: z.array(z.string().min(1)),
    balls: z.array(BallEventSchema),
  })
  .strict();

export const MatchSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    startedAt: z.string().datetime({ offset: true }),
    completedAt: z.string().datetime({ offset: true }).nullable(),
    status: MatchStatusSchema,
    format: MatchFormatSchema,
    overs: z.number().int().min(1).max(450),
    venue: z.string().trim().min(2).max(120),
    tossWinnerTeamId: z.string().min(1),
    tossDecision: TossDecisionSchema,
    teamAId: z.string().min(1),
    teamBId: z.string().min(1),
    target: z.number().int().min(0).nullable(),
    innings: z.tuple([InningsStateSchema, InningsStateSchema]),
    winnerTeamId: z.string().min(1).nullable(),
  })
  .strict();

export const PlayerAggregateStatsSchema = z
  .object({
    playerId: z.string().min(1),
    matches: z.number().int().min(0),
    battingRuns: z.number().int().min(0),
    battingBalls: z.number().int().min(0),
    fours: z.number().int().min(0),
    sixes: z.number().int().min(0),
    outs: z.number().int().min(0),
    wickets: z.number().int().min(0),
    bowlingBalls: z.number().int().min(0),
    bowlingRuns: z.number().int().min(0),
    catches: z.number().int().min(0),
    stumpings: z.number().int().min(0),
    runOuts: z.number().int().min(0),
  })
  .strict();

export const CricketStoreSchema = z
  .object({
    teams: z.array(TeamSchema),
    matches: z.array(MatchSchema),
  })
  .strict();

export const TeamCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Team name is required"),
    shortName: z.string().trim().min(2).max(4),
    players: z
      .array(
        z
          .object({
            name: z.string().trim().min(2),
            role: PlayerRoleSchema,
          })
          .strict()
      )
      .min(2, "At least 2 players are required")
      .max(30, "At most 30 players are allowed"),
  })
  .strict();

export const MatchCreateSchema = z
  .object({
    format: MatchFormatSchema,
    overs: z.number().int().min(1).max(450),
    venue: z.string().trim().min(2).max(100),
    teamAId: z.string().min(1),
    teamBId: z.string().min(1),
    tossWinnerTeamId: z.string().min(1),
    tossDecision: TossDecisionSchema,
    openingStrikerId: z.string().min(1),
    openingNonStrikerId: z.string().min(1),
    openingBowlerId: z.string().min(1),
  })
  .strict();

export const ScoreEventSchema = z
  .object({
    runsOffBat: z.number().int().min(0).max(6),
    extraRuns: z.number().int().min(0).max(6),
    extraType: ExtraTypeSchema,
    isWicket: z.boolean().default(false),
    wicketType: WicketTypeSchema.nullable().optional(),
    nextBatterId: z.string().optional(),
    nextBowlerId: z.string().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.isWicket && !value.wicketType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "wicketType is required when isWicket is true",
        path: ["wicketType"],
      });
    }
  });

export type TeamCreateInput = z.infer<typeof TeamCreateSchema>;
export type MatchCreateInput = z.infer<typeof MatchCreateSchema>;
export type ScoreEventInput = z.infer<typeof ScoreEventSchema>;
