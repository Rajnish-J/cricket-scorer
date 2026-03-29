"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MATCH_PRESETS } from "@/data/match-presets";
import { getJson, postJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MatchCreateInput, TeamCreateInput } from "@/lib/scorer-schema";
import type { MatchResponse, TeamsResponse } from "@/types/api";
import type { MatchFormat, Player, Team } from "@/types/scorer";

interface TeamFormPlayer {
  name: string;
  role: Player["role"];
}

const defaultTeamPlayer: TeamFormPlayer = {
  name: "",
  role: "all-rounder",
};

function getBattingFirstTeamId(
  tossWinnerTeamId: string,
  tossDecision: "bat" | "bowl",
  teamAId: string,
  teamBId: string
): string {
  if (tossDecision === "bat") {
    return tossWinnerTeamId;
  }

  return tossWinnerTeamId === teamAId ? teamBId : teamAId;
}

export function NewMatchContainer(): React.JSX.Element {
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [teamShortName, setTeamShortName] = useState("");
  const [teamPlayers, setTeamPlayers] = useState<TeamFormPlayer[]>([
    { ...defaultTeamPlayer },
    { ...defaultTeamPlayer },
  ]);

  const [format, setFormat] = useState<MatchFormat>("T20");
  const [overs, setOvers] = useState(20);
  const [venue, setVenue] = useState("Community Ground");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [tossWinnerTeamId, setTossWinnerTeamId] = useState("");
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">("bat");
  const [openingStrikerId, setOpeningStrikerId] = useState("");
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState("");
  const [openingBowlerId, setOpeningBowlerId] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadTeams(): Promise<void> {
    setLoadingTeams(true);
    try {
      const response = await getJson<TeamsResponse>("/api/teams");
      setTeams(response.teams);
      if (response.teams.length >= 2) {
        setTeamAId((prev) => prev || response.teams[0].id);
        setTeamBId((prev) => prev || response.teams[1].id);
      }
    } catch {
      setError("Unable to load teams.");
    } finally {
      setLoadingTeams(false);
    }
  }

  useEffect(() => {
    void loadTeams();
  }, []);

  useEffect(() => {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      return;
    }

    if (!tossWinnerTeamId || (tossWinnerTeamId !== teamAId && tossWinnerTeamId !== teamBId)) {
      setTossWinnerTeamId(teamAId);
    }
  }, [teamAId, teamBId, tossWinnerTeamId]);

  const battingTeam = useMemo(() => {
    if (!teamAId || !teamBId || !tossWinnerTeamId || teamAId === teamBId) {
      return null;
    }

    const battingTeamId = getBattingFirstTeamId(
      tossWinnerTeamId,
      tossDecision,
      teamAId,
      teamBId
    );

    return teams.find((team) => team.id === battingTeamId) ?? null;
  }, [teamAId, teamBId, teams, tossDecision, tossWinnerTeamId]);

  const bowlingTeam = useMemo(() => {
    if (!battingTeam) {
      return null;
    }

    const selectedTeamIds = [teamAId, teamBId].filter(Boolean);
    const team = teams.find(
      (candidate) =>
        selectedTeamIds.includes(candidate.id) && candidate.id !== battingTeam.id
    );
    return team ?? null;
  }, [battingTeam, teamAId, teamBId, teams]);

  useEffect(() => {
    if (!battingTeam || battingTeam.players.length < 2) {
      setOpeningStrikerId("");
      setOpeningNonStrikerId("");
      return;
    }

    const first = battingTeam.players[0].id;
    const second = battingTeam.players[1].id;
    setOpeningStrikerId((prev) => prev || first);
    setOpeningNonStrikerId((prev) => (prev && prev !== first ? prev : second));
  }, [battingTeam]);

  useEffect(() => {
    if (!bowlingTeam || bowlingTeam.players.length < 1) {
      setOpeningBowlerId("");
      return;
    }

    setOpeningBowlerId((prev) => prev || bowlingTeam.players[0].id);
  }, [bowlingTeam]);

  function selectPreset(nextFormat: MatchFormat, presetOvers: number): void {
    setFormat(nextFormat);
    setOvers(presetOvers);
  }

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
      await postJson<{ team: Team }>("/api/teams", payload);
      setTeamName("");
      setTeamShortName("");
      setTeamPlayers([{ ...defaultTeamPlayer }, { ...defaultTeamPlayer }]);
      setError(null);
      await loadTeams();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create team.");
    } finally {
      setBusy(false);
    }
  }

  async function startMatch(): Promise<void> {
    if (!teamAId || !teamBId || teamAId === teamBId || !tossWinnerTeamId) {
      setError("Choose two different teams and toss winner.");
      return;
    }

    const payload: MatchCreateInput = {
      format,
      overs,
      venue,
      teamAId,
      teamBId,
      tossWinnerTeamId,
      tossDecision,
      openingStrikerId,
      openingNonStrikerId,
      openingBowlerId,
    };

    if (!payload.openingStrikerId || !payload.openingNonStrikerId || !payload.openingBowlerId) {
      setError("Select opening batters and opening bowler.");
      return;
    }

    try {
      setBusy(true);
      const response = await postJson<MatchResponse>("/api/matches", payload);
      router.push(`/match/${response.match.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start match.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
        <h2 className="text-lg font-semibold">Create Team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Register team with player list before scheduling the match.
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
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
        <h2 className="text-lg font-semibold">Schedule New Match</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start live scoring after selecting format, teams, toss, and opening players.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {MATCH_PRESETS.map((preset) => (
            <Button
              key={preset.format}
              variant={format === preset.format ? "default" : "outline"}
              type="button"
              onClick={() => selectPreset(preset.format, preset.overs)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <Input
            type="number"
            min={1}
            max={450}
            value={overs}
            onChange={(event) => setOvers(Number(event.target.value) || 1)}
            placeholder="Overs"
          />
          <Input value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Venue" />

          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={teamAId}
              disabled={loadingTeams}
              onChange={(event) => setTeamAId(event.target.value)}
            >
              <option value="">Team A</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={teamBId}
              disabled={loadingTeams}
              onChange={(event) => setTeamBId(event.target.value)}
            >
              <option value="">Team B</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={tossWinnerTeamId}
              onChange={(event) => setTossWinnerTeamId(event.target.value)}
            >
              <option value="">Toss Winner</option>
              {[teamAId, teamBId]
                .filter(Boolean)
                .map((id) => teams.find((team) => team.id === id))
                .filter((team): team is Team => Boolean(team))
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={tossDecision}
              onChange={(event) => setTossDecision(event.target.value as "bat" | "bowl")}
            >
              <option value="bat">Toss decision: Bat</option>
              <option value="bowl">Toss decision: Bowl</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={openingStrikerId}
              onChange={(event) => setOpeningStrikerId(event.target.value)}
            >
              <option value="">Opening striker</option>
              {battingTeam?.players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={openingNonStrikerId}
              onChange={(event) => setOpeningNonStrikerId(event.target.value)}
            >
              <option value="">Opening non-striker</option>
              {battingTeam?.players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={openingBowlerId}
              onChange={(event) => setOpeningBowlerId(event.target.value)}
            >
              <option value="">Opening bowler</option>
              {bowlingTeam?.players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <Button type="button" onClick={() => void startMatch()} disabled={busy || teams.length < 2}>
            Start Match and Open Scoreboard
          </Button>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </section>
    </div>
  );
}

