import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { PlayerSchema, TeamSchema } from "@/lib/scorer-schema";
import { playersTable, teamsTable } from "@/db/schema";
import { createId } from "@/lib/id";
import type { TeamCreateInput } from "@/lib/scorer-schema";
import type { Player, Team } from "@/types/scorer";

interface TeamWithPlayersRows {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamCreatedAt: Date | string;
  playerId: string | null;
  playerName: string | null;
  playerRole: Player["role"] | null;
}

function toIsoTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function mapRowsToTeams(rows: TeamWithPlayersRows[]): Team[] {
  const teamMap = new Map<string, Team>();

  for (const row of rows) {
    const existing = teamMap.get(row.teamId);
    if (!existing) {
      teamMap.set(row.teamId, {
        id: row.teamId,
        name: row.teamName,
        shortName: row.teamShortName,
        createdAt: toIsoTimestamp(row.teamCreatedAt),
        players: [],
      });
    }

    if (row.playerId && row.playerName && row.playerRole) {
      const team = teamMap.get(row.teamId);
      team?.players.push(
        PlayerSchema.parse({
          id: row.playerId,
          name: row.playerName,
          role: row.playerRole,
        })
      );
    }
  }

  return Array.from(teamMap.values()).map((team) => TeamSchema.parse(team));
}

export const teamRepository = {
  async listTeams(): Promise<Team[]> {
    const rows = await db
      .select({
        teamId: teamsTable.id,
        teamName: teamsTable.name,
        teamShortName: teamsTable.shortName,
        teamCreatedAt: teamsTable.createdAt,
        playerId: playersTable.id,
        playerName: playersTable.name,
        playerRole: playersTable.role,
      })
      .from(teamsTable)
      .leftJoin(playersTable, eq(playersTable.teamId, teamsTable.id))
      .orderBy(asc(teamsTable.createdAt), asc(playersTable.createdAt));

    return mapRowsToTeams(rows);
  },

  async getTeamById(teamId: string): Promise<Team | null> {
    const rows = await db
      .select({
        teamId: teamsTable.id,
        teamName: teamsTable.name,
        teamShortName: teamsTable.shortName,
        teamCreatedAt: teamsTable.createdAt,
        playerId: playersTable.id,
        playerName: playersTable.name,
        playerRole: playersTable.role,
      })
      .from(teamsTable)
      .leftJoin(playersTable, eq(playersTable.teamId, teamsTable.id))
      .where(eq(teamsTable.id, teamId))
      .orderBy(asc(playersTable.createdAt));

    if (rows.length === 0) {
      return null;
    }

    return mapRowsToTeams(rows)[0] ?? null;
  },

  async createTeam(input: TeamCreateInput): Promise<Team | null> {
    const existing = await db
      .select({ id: teamsTable.id })
      .from(teamsTable)
      .where(sql`lower(${teamsTable.name}) = lower(${input.name})`)
      .limit(1);

    if (existing.length > 0) {
      return null;
    }

    const teamId = createId("team");

    await db.transaction(async (transaction) => {
      await transaction.insert(teamsTable).values({
        id: teamId,
        name: input.name,
        shortName: input.shortName.toUpperCase(),
      });

      await transaction.insert(playersTable).values(
        input.players.map((player) => ({
          id: createId("player"),
          teamId,
          name: player.name,
          role: player.role,
        }))
      );
    });

    return this.getTeamById(teamId);
  },

  async getPlayer(teamId: string, playerId: string): Promise<Player | null> {
    const row = await db
      .select({
        id: playersTable.id,
        name: playersTable.name,
        role: playersTable.role,
      })
      .from(playersTable)
      .where(and(eq(playersTable.id, playerId), eq(playersTable.teamId, teamId)))
      .limit(1);

    if (!row[0]) {
      return null;
    }

    return PlayerSchema.parse(row[0]);
  },
};
