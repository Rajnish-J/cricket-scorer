export type MatchFormat = "T10" | "T20" | "ODI" | "TEST" | "CUSTOM";

export type MatchStatus = "scheduled" | "live" | "completed";

export type ExtraType = "none" | "wide" | "no-ball" | "bye" | "leg-bye";

export type WicketType =
  | "bowled"
  | "caught"
  | "lbw"
  | "run-out"
  | "stumped"
  | "hit-wicket"
  | "retired-out";

export interface Player {
  id: string;
  name: string;
  role: "batter" | "bowler" | "all-rounder" | "wicket-keeper";
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  players: Player[];
  createdAt: string;
}

export interface BallEvent {
  id: string;
  inningsNumber: 1 | 2;
  over: number;
  ballInOver: number;
  runsOffBat: number;
  extraRuns: number;
  extraType: ExtraType;
  isWicket: boolean;
  wicketType: WicketType | null;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  totalRuns: number;
  createdAt: string;
}

export interface InningsState {
  battingTeamId: string;
  bowlingTeamId: string;
  oversLimit: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  completed: boolean;
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  yetToBatIds: string[];
  balls: BallEvent[];
}

export interface Match {
  id: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string;
  completedAt: string | null;
  status: MatchStatus;
  format: MatchFormat;
  overs: number;
  venue: string;
  tossWinnerTeamId: string;
  tossDecision: "bat" | "bowl";
  teamAId: string;
  teamBId: string;
  target: number | null;
  innings: [InningsState, InningsState];
  winnerTeamId: string | null;
}

export interface PlayerAggregateStats {
  playerId: string;
  matches: number;
  battingRuns: number;
  battingBalls: number;
  fours: number;
  sixes: number;
  outs: number;
  wickets: number;
  bowlingBalls: number;
  bowlingRuns: number;
  catches: number;
  stumpings: number;
  runOuts: number;
}

export interface CricketStore {
  teams: Team[];
  matches: Match[];
}

