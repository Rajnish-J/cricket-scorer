"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getJson, postJson } from "@/lib/api-client";
import type { TeamCreateInput } from "@/lib/scorer-schema";
import type { TeamsResponse } from "@/types/api";
import type { Player, Team } from "@/types/scorer";

interface TeamFormPlayer {
  name: string;
  role: Player["role"];
}

const defaultTeamPlayer: TeamFormPlayer = {
  name: "",
  role: "all-rounder",
};

export function TeamsContainer(): React.JSX.Element {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [teamShortName, setTeamShortName] = useState("");
  const [teamPlayers, setTeamPlayers] = useState<TeamFormPlayer[]>([
    { ...defaultTeamPlayer },
    { ...defaultTeamPlayer },
  ]);

  async function loadTeams(): Promise<void> {
    setLoading(true);
    try {
      const response = await getJson<TeamsResponse>("/api/teams");
      setTeams(response.teams);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeams();
  }, []);

  function updateTeamPlayerName(index: number, value: string): void {
    setTeamPlayers((previous) =>
      previous.map((player, playerIndex) =>
        playerIndex === index ? { ...player, name: value } : player
      )
    );
  }

  function updateTeamPlayerRole(index: number, value: Player["role"]): void {
    setTeamPlayers((previous) =>
      previous.map((player, playerIndex) =>
        playerIndex === index ? { ...player, role: value } : player
      )
    );
  }

  async function createTeam(): Promise<void> {
    const cleanPlayers = teamPlayers.filter((player) => player.name.trim().length > 1);
    const payload: TeamCreateInput = {
      name: teamName.trim(),
      shortName: teamShortName.trim().toUpperCase(),
      players: cleanPlayers,
    };

    if (!payload.name || !payload.shortName || payload.players.length < 2) {
      setError("Team name, short name, and at least 2 players are required.");
      return;
    }

    try {
      setBusy(true);
      setError(null);
      await postJson<{ team: Team }>("/api/teams", payload);
      setTeamName("");
      setTeamShortName("");
      setTeamPlayers([{ ...defaultTeamPlayer }, { ...defaultTeamPlayer }]);
      await loadTeams();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create team.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
        <h2 className="text-lg font-semibold">Create Team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Register teams and players here, then use New Match to start scoring.
        </p>

        <div className="mt-4 space-y-3">
          <Input
            placeholder="Team name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
          />
          <Input
            placeholder="Short name (e.g. IND)"
            value={teamShortName}
            onChange={(event) => setTeamShortName(event.target.value)}
          />

          <div className="space-y-2">
            {teamPlayers.map((player, index) => (
              <div key={`team-player-${index}`} className="grid grid-cols-3 gap-2">
                <Input
                  className="col-span-2"
                  placeholder={`Player ${index + 1}`}
                  value={player.name}
                  onChange={(event) => updateTeamPlayerName(index, event.target.value)}
                />
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={player.role}
                  onChange={(event) =>
                    updateTeamPlayerRole(index, event.target.value as Player["role"])
                  }
                >
                  <option value="all-rounder">All-rounder</option>
                  <option value="batter">Batter</option>
                  <option value="bowler">Bowler</option>
                  <option value="wicket-keeper">Wicket-keeper</option>
                </select>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={teamPlayers.length >= 11}
              onClick={() =>
                setTeamPlayers((previous) => [...previous, { ...defaultTeamPlayer }])
              }
            >
              Add Player
            </Button>
            <Button type="button" onClick={() => void createTeam()} disabled={busy}>
              Save Team
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </section>

      <section>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading teams...</p>
        ) : teams.length === 0 ? (
          <div className="rounded-xl border p-6">
            <p className="text-sm text-muted-foreground">No teams yet. Create your first team above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-xs"
              >
                <p className="text-xs text-muted-foreground">{team.shortName}</p>
                <h2 className="mt-1 text-lg font-semibold">{team.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Players: {team.players.length}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
