import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { matchesTable } from "@/db/schema";
import { MatchSchema } from "@/lib/scorer-schema";
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
  return MatchSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  });
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
    const safeMatch = MatchSchema.parse(match);

    await db.insert(matchesTable).values({
      id: safeMatch.id,
      status: safeMatch.status,
      format: safeMatch.format,
      overs: safeMatch.overs,
      venue: safeMatch.venue,
      tossWinnerTeamId: safeMatch.tossWinnerTeamId,
      tossDecision: safeMatch.tossDecision,
      teamAId: safeMatch.teamAId,
      teamBId: safeMatch.teamBId,
      target: safeMatch.target,
      innings: safeMatch.innings,
      winnerTeamId: safeMatch.winnerTeamId,
      createdAt: new Date(safeMatch.createdAt),
      startedAt: new Date(safeMatch.startedAt),
      completedAt: safeMatch.completedAt ? new Date(safeMatch.completedAt) : null,
      updatedAt: new Date(safeMatch.updatedAt),
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
    const safeMatch = MatchSchema.parse(match);

    await db
      .update(matchesTable)
      .set({
        status: safeMatch.status,
        target: safeMatch.target,
        innings: safeMatch.innings,
        winnerTeamId: safeMatch.winnerTeamId,
        completedAt: safeMatch.completedAt ? new Date(safeMatch.completedAt) : null,
        updatedAt: new Date(safeMatch.updatedAt),
      })
      .where(eq(matchesTable.id, safeMatch.id));
  },
};
