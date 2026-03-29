"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getJson } from "@/lib/api-client";
import { toOversString } from "@/lib/match-utils";
import type { MatchesResponse, TeamsResponse } from "@/types/api";
import type { Match, Team } from "@/types/scorer";

function getTeamName(teams: Team[], id: string): string {
  return teams.find((team) => team.id === id)?.name ?? "Unknown Team";
}

export function HistoryContainer(): React.JSX.Element {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run(): Promise<void> {
      try {
        const [historyResponse, teamsResponse] = await Promise.all([
          getJson<MatchesResponse>("/api/matches?status=completed"),
          getJson<TeamsResponse>("/api/teams"),
        ]);

        setMatches(historyResponse.matches);
        setTeams(teamsResponse.teams);
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, []);

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [matches]
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading history...</p>;
  }

  if (sortedMatches.length === 0) {
    return <p className="text-sm text-muted-foreground">No completed matches yet.</p>;
  }

  return (
    <div className="space-y-4">
      {sortedMatches.map((match) => (
        <article key={match.id} className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              {getTeamName(teams, match.teamAId)} vs {getTeamName(teams, match.teamBId)}
            </h2>
            <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
              {match.format} • {match.overs} overs
            </span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Venue: {match.venue} • Result:{" "}
            {match.winnerTeamId ? `${getTeamName(teams, match.winnerTeamId)} won` : "Match tied"}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {match.innings.map((innings, inningsIndex) => (
              <div key={`${match.id}-innings-${inningsIndex}`} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Innings {inningsIndex + 1} • {getTeamName(teams, innings.battingTeamId)}
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {innings.runs}/{innings.wickets}
                </p>
                <p className="text-sm text-muted-foreground">
                  Overs: {toOversString(innings.legalBalls)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <p className="mb-2 text-xs text-muted-foreground">Recent balls</p>
            <div className="flex flex-wrap gap-2">
              {match.innings
                .flatMap((innings) => innings.balls)
                .slice(-12)
                .map((ball) => (
                  <span
                    key={ball.id}
                    className="rounded-md border px-2 py-1 text-xs font-medium"
                  >
                    {ball.over}.{ball.ballInOver} • {ball.totalRuns}
                    {ball.isWicket ? "W" : ""}
                  </span>
                ))}
            </div>
          </div>

          <Link href={`/match/${match.id}`} className="mt-4 inline-block text-sm font-medium text-primary">
            Open scorecard
          </Link>
        </article>
      ))}
    </div>
  );
}

