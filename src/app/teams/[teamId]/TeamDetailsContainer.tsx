"use client";

import { useEffect, useMemo, useState } from "react";

import { getJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { PlayerResponse, TeamResponse } from "@/types/api";
import type { PlayerAggregateStats } from "@/types/scorer";

interface TeamDetailsContainerProps {
  teamId: string;
}

const emptyStats: PlayerAggregateStats = {
  playerId: "",
  matches: 0,
  battingRuns: 0,
  battingBalls: 0,
  fours: 0,
  sixes: 0,
  outs: 0,
  wickets: 0,
  bowlingBalls: 0,
  bowlingRuns: 0,
  catches: 0,
  stumpings: 0,
  runOuts: 0,
};

export function TeamDetailsContainer({ teamId }: TeamDetailsContainerProps): React.JSX.Element {
  const [team, setTeam] = useState<TeamResponse["team"] | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedStats, setSelectedStats] = useState<PlayerAggregateStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run(): Promise<void> {
      setLoading(true);
      try {
        const response = await getJson<TeamResponse>(`/api/teams/${teamId}`);
        setTeam(response.team);
        const defaultPlayerId = response.team.players[0]?.id ?? "";
        setSelectedPlayerId(defaultPlayerId);
        setSelectedStats(response.team.players[0]?.stats ?? null);
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, [teamId]);

  useEffect(() => {
    async function loadPlayerStats(): Promise<void> {
      if (!selectedPlayerId || !team) {
        return;
      }

      const response = await getJson<PlayerResponse>(
        `/api/teams/${team.id}/players/${selectedPlayerId}`
      );
      setSelectedStats(response.stats);
    }

    void loadPlayerStats();
  }, [selectedPlayerId, team]);

  const selectedPlayer = useMemo(() => {
    if (!team || !selectedPlayerId) {
      return null;
    }

    return team.players.find((player) => player.id === selectedPlayerId) ?? null;
  }, [selectedPlayerId, team]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading team...</p>;
  }

  if (!team) {
    return <p className="text-sm text-destructive">Team not found.</p>;
  }

  const stats = selectedStats ?? emptyStats;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="rounded-xl border p-4 lg:col-span-1">
        <h2 className="text-lg font-semibold">{team.name}</h2>
        <p className="text-sm text-muted-foreground">{team.shortName}</p>
        <div className="mt-4 space-y-2">
          {team.players.map((player) => (
            <Button
              key={player.id}
              type="button"
              variant={selectedPlayerId === player.id ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setSelectedPlayerId(player.id)}
            >
              {player.name}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-4 lg:col-span-2">
        <h3 className="text-lg font-semibold">{selectedPlayer?.name ?? "Player"} Stats</h3>
        <p className="text-sm text-muted-foreground">Batting, bowling, and fielding summary</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Matches</p>
            <p className="text-2xl font-semibold">{stats.matches}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Batting</p>
            <p className="text-2xl font-semibold">
              {stats.battingRuns} ({stats.battingBalls})
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Fours / Sixes</p>
            <p className="text-2xl font-semibold">
              {stats.fours} / {stats.sixes}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Wickets</p>
            <p className="text-2xl font-semibold">{stats.wickets}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Bowling</p>
            <p className="text-2xl font-semibold">
              {stats.bowlingRuns} / {stats.bowlingBalls}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Fielding</p>
            <p className="text-2xl font-semibold">
              {stats.catches + stats.stumpings + stats.runOuts}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

