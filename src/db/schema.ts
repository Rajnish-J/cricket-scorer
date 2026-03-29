import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import type { InningsState } from "@/types/scorer";

export const playerRoleEnum = pgEnum("player_role", [
  "batter",
  "bowler",
  "all-rounder",
  "wicket-keeper",
]);

export const matchStatusEnum = pgEnum("match_status", ["scheduled", "live", "completed"]);

export const matchFormatEnum = pgEnum("match_format", ["T10", "T20", "ODI", "TEST", "CUSTOM"]);

export const tossDecisionEnum = pgEnum("toss_decision", ["bat", "bowl"]);

export const teamsTable = pgTable("teams", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  shortName: varchar("short_name", { length: 6 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playersTable = pgTable("players", {
  id: varchar("id", { length: 64 }).primaryKey(),
  teamId: varchar("team_id", { length: 64 })
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  role: playerRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const matchesTable = pgTable("matches", {
  id: varchar("id", { length: 64 }).primaryKey(),
  status: matchStatusEnum("status").notNull(),
  format: matchFormatEnum("format").notNull(),
  overs: integer("overs").notNull(),
  venue: varchar("venue", { length: 120 }).notNull(),
  tossWinnerTeamId: varchar("toss_winner_team_id", { length: 64 })
    .notNull()
    .references(() => teamsTable.id, { onDelete: "restrict" }),
  tossDecision: tossDecisionEnum("toss_decision").notNull(),
  teamAId: varchar("team_a_id", { length: 64 })
    .notNull()
    .references(() => teamsTable.id, { onDelete: "restrict" }),
  teamBId: varchar("team_b_id", { length: 64 })
    .notNull()
    .references(() => teamsTable.id, { onDelete: "restrict" }),
  target: integer("target"),
  innings: jsonb("innings").$type<[InningsState, InningsState]>().notNull(),
  winnerTeamId: varchar("winner_team_id", { length: 64 }).references(() => teamsTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teamRelations = relations(teamsTable, ({ many }) => ({
  players: many(playersTable),
}));

export const playerRelations = relations(playersTable, ({ one }) => ({
  team: one(teamsTable, {
    fields: [playersTable.teamId],
    references: [teamsTable.id],
  }),
}));
