CREATE TYPE "public"."match_format" AS ENUM('T10', 'T20', 'ODI', 'TEST', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'completed');--> statement-breakpoint
CREATE TYPE "public"."player_role" AS ENUM('batter', 'bowler', 'all-rounder', 'wicket-keeper');--> statement-breakpoint
CREATE TYPE "public"."toss_decision" AS ENUM('bat', 'bowl');--> statement-breakpoint
CREATE TABLE "matches" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"status" "match_status" NOT NULL,
	"format" "match_format" NOT NULL,
	"overs" integer NOT NULL,
	"venue" varchar(120) NOT NULL,
	"toss_winner_team_id" varchar(64) NOT NULL,
	"toss_decision" "toss_decision" NOT NULL,
	"team_a_id" varchar(64) NOT NULL,
	"team_b_id" varchar(64) NOT NULL,
	"target" integer,
	"innings" jsonb NOT NULL,
	"winner_team_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"team_id" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"role" "player_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"short_name" varchar(6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_toss_winner_team_id_teams_id_fk" FOREIGN KEY ("toss_winner_team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_id_teams_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_id_teams_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;