import { z } from "zod";

import {
  BallEventSchema,
  CricketStoreSchema,
  ExtraTypeSchema,
  InningsStateSchema,
  MatchFormatSchema,
  MatchSchema,
  MatchStatusSchema,
  PlayerAggregateStatsSchema,
  PlayerRoleSchema,
  PlayerSchema,
  TeamSchema,
  TossDecisionSchema,
  WicketTypeSchema,
} from "@/lib/scorer-schema";

export type MatchFormat = z.infer<typeof MatchFormatSchema>;
export type MatchStatus = z.infer<typeof MatchStatusSchema>;
export type ExtraType = z.infer<typeof ExtraTypeSchema>;
export type WicketType = z.infer<typeof WicketTypeSchema>;
export type TossDecision = z.infer<typeof TossDecisionSchema>;
export type PlayerRole = z.infer<typeof PlayerRoleSchema>;

export type Player = z.infer<typeof PlayerSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type BallEvent = z.infer<typeof BallEventSchema>;
export type InningsState = z.infer<typeof InningsStateSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type PlayerAggregateStats = z.infer<typeof PlayerAggregateStatsSchema>;
export type CricketStore = z.infer<typeof CricketStoreSchema>;
