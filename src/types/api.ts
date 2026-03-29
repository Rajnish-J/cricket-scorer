import type { Match, PlayerAggregateStats, Team } from "@/types/scorer";

export interface TeamWithStats extends Omit<Team, "players"> {
  players: Array<Team["players"][number] & { stats: PlayerAggregateStats }>;
}

export interface TeamsResponse {
  teams: Team[];
}

export interface TeamResponse {
  team: TeamWithStats;
}

export interface MatchesResponse {
  matches: Match[];
}

export interface MatchResponse {
  match: Match;
  teams?: {
    teamA: Team | null;
    teamB: Team | null;
  };
}

export interface PlayerResponse {
  player: Team["players"][number];
  stats: PlayerAggregateStats;
}

