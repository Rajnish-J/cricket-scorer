import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { matchesTable } from "@/db/schema";
import type { Match, MatchStatus } from "@/types/scorer";

interface MatchRow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date;
  completedAt: Date | null;
  status: MatchStatus;
  format: Match["format"];
  overs: number;
  venue: string;
  tossWinnerTeamId: string;
  tossDecision: Match["tossDecision"];
  teamAId: string;
  teamBId: string;
  target: number | null;
  innings: Match["innings"];
  winnerTeamId: string | null;
}

function mapRowToMatch(row: MatchRow): Match {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export const matchRepository = {
  async listMatches(status?: MatchStatus): Promise<Match[]> {
    const base = db.select().from(matchesTable).orderBy(desc(matchesTable.updatedAt));
    const rows =
      typeof status === "string"
        ? await base.where(eq(matchesTable.status, status))
        : await base;

    return rows.map((row) => mapRowToMatch(row as MatchRow));
  },

  async createMatch(match: Match): Promise<void> {
    await db.insert(matchesTable).values({
      id: match.id,
      status: match.status,
      format: match.format,
      overs: match.overs,
      venue: match.venue,
      tossWinnerTeamId: match.tossWinnerTeamId,
      tossDecision: match.tossDecision,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      target: match.target,
      innings: match.innings,
      winnerTeamId: match.winnerTeamId,
      createdAt: new Date(match.createdAt),
      startedAt: new Date(match.startedAt),
      completedAt: match.completedAt ? new Date(match.completedAt) : null,
      updatedAt: new Date(match.updatedAt),
    });
  },

  async getMatchById(matchId: string): Promise<Match | null> {
    const rows = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return mapRowToMatch(rows[0] as MatchRow);
  },

  async updateMatch(match: Match): Promise<void> {
    await db
      .update(matchesTable)
      .set({
        status: match.status,
        target: match.target,
        innings: match.innings,
        winnerTeamId: match.winnerTeamId,
        completedAt: match.completedAt ? new Date(match.completedAt) : null,
        updatedAt: new Date(match.updatedAt),
      })
      .where(eq(matchesTable.id, match.id));
  },
};
