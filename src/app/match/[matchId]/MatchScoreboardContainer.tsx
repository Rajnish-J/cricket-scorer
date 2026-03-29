"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getJson, postJson } from "@/lib/api-client";
import { createRunRate, currentInningsIndex, toOversString } from "@/lib/match-utils";
import type { MatchResponse } from "@/types/api";
import type { BallEvent, ExtraType, InningsState, Match, Team, WicketType } from "@/types/scorer";
import type { TeamPlayerCreateInput } from "@/lib/scorer-schema";

interface MatchScoreboardContainerProps {
  matchId: string;
}

interface BatterScore {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissal: string;
}

interface BowlerScore {
  playerId: string;
  name: string;
  balls: number;
  runs: number;
  wickets: number;
}

function isLegalDelivery(extraType: ExtraType): boolean {
  return extraType !== "wide" && extraType !== "no-ball";
}

function getTeamName(teams: Team[], teamId: string): string {
  return teams.find((team) => team.id === teamId)?.name ?? "Unknown Team";
}

function getPlayerName(teams: Team[], playerId: string): string {
  for (const team of teams) {
    const player = team.players.find((candidate) => candidate.id === playerId);
    if (player) {
      return player.name;
    }
  }
  return "Unknown Player";
}

function formatBallChip(ball: BallEvent): string {
  const extraLabelMap: Record<ExtraType, string> = {
    none: "",
    wide: "Wd",
    "no-ball": "Nb",
    bye: "B",
    "leg-bye": "Lb",
  };

  const extraLabel = extraLabelMap[ball.extraType];
  const wicketLabel = ball.isWicket ? "W" : "";
  const runLabel = `${ball.totalRuns}`;

  return [runLabel, extraLabel, wicketLabel].filter(Boolean).join(" ");
}

function groupBallsByOver(balls: BallEvent[]): Array<{ over: number; balls: BallEvent[] }> {
  const overMap = new Map<number, BallEvent[]>();

  for (const ball of balls) {
    const existing = overMap.get(ball.over) ?? [];
    existing.push(ball);
    overMap.set(ball.over, existing);
  }

  return Array.from(overMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([over, groupedBalls]) => ({ over, balls: groupedBalls }));
}

function buildInningsScorecard(
  innings: InningsState,
  teams: Team[]
): { batters: BatterScore[]; bowlers: BowlerScore[] } {
  const battingTeam = teams.find((team) => team.id === innings.battingTeamId);
  const bowlingTeam = teams.find((team) => team.id === innings.bowlingTeamId);

  const batterMap = new Map<string, BatterScore>();
  const bowlerMap = new Map<string, BowlerScore>();

  battingTeam?.players.forEach((player) => {
    batterMap.set(player.id, {
      playerId: player.id,
      name: player.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      dismissal: "not out",
    });
  });

  bowlingTeam?.players.forEach((player) => {
    bowlerMap.set(player.id, {
      playerId: player.id,
      name: player.name,
      balls: 0,
      runs: 0,
      wickets: 0,
    });
  });

  for (const ball of innings.balls) {
    const batter = batterMap.get(ball.strikerId);
    if (batter) {
      batter.runs += ball.runsOffBat;
      if (isLegalDelivery(ball.extraType)) {
        batter.balls += 1;
      }
      if (ball.runsOffBat === 4) {
        batter.fours += 1;
      }
      if (ball.runsOffBat === 6) {
        batter.sixes += 1;
      }
      if (ball.isWicket) {
        batter.out = true;
        batter.dismissal = ball.wicketType ? ball.wicketType.replace("-", " ") : "out";
      }
    }

    const bowler = bowlerMap.get(ball.bowlerId);
    if (bowler) {
      bowler.runs += ball.totalRuns;
      if (isLegalDelivery(ball.extraType)) {
        bowler.balls += 1;
      }
      if (ball.isWicket && ball.wicketType !== "run-out") {
        bowler.wickets += 1;
      }
    }
  }

  const batters = Array.from(batterMap.values()).filter(
    (batter) => batter.balls > 0 || batter.out || batter.runs > 0
  );

  const bowlers = Array.from(bowlerMap.values()).filter(
    (bowler) => bowler.balls > 0 || bowler.runs > 0 || bowler.wickets > 0
  );

  return { batters, bowlers };
}

const wicketTypes: WicketType[] = [
  "bowled",
  "caught",
  "lbw",
  "run-out",
  "stumped",
  "hit-wicket",
  "retired-out",
];

export function MatchScoreboardContainer({
  matchId,
}: MatchScoreboardContainerProps): React.JSX.Element {
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [runsOffBat, setRunsOffBat] = useState(0);
  const [extraType, setExtraType] = useState<ExtraType>("none");
  const [extraRuns, setExtraRuns] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>("bowled");
  const [nextBatterId, setNextBatterId] = useState("");
  const [nextBowlerId, setNextBowlerId] = useState("");
  const [newBatterName, setNewBatterName] = useState("");
  const [newBatterRole, setNewBatterRole] = useState<TeamPlayerCreateInput["role"]>("batter");
  const [creatingPlayer, setCreatingPlayer] = useState(false);

  const loadMatch = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await getJson<MatchResponse>(`/api/matches/${matchId}`);
      setMatch(response.match);

      const responseTeams = [response.teams?.teamA, response.teams?.teamB].filter(
        (team): team is Team => Boolean(team)
      );
      setTeams(responseTeams);
      setError(null);
    } catch {
      setError("Unable to load match.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void loadMatch();
  }, [loadMatch]);

  const inningsIndex = useMemo(() => (match ? currentInningsIndex(match) : 0), [match]);

  const innings = useMemo(() => {
    if (!match) {
      return null;
    }
    return match.innings[inningsIndex];
  }, [inningsIndex, match]);

  const battingTeam = useMemo(() => {
    if (!innings) {
      return null;
    }

    return teams.find((team) => team.id === innings.battingTeamId) ?? null;
  }, [innings, teams]);

  const bowlingTeam = useMemo(() => {
    if (!innings) {
      return null;
    }

    return teams.find((team) => team.id === innings.bowlingTeamId) ?? null;
  }, [innings, teams]);

  const eligibleNextBatterIds = useMemo(() => {
    if (!innings || !battingTeam) {
      return [];
    }

    const dismissedBatterIds = new Set(
      innings.balls.filter((ball) => ball.isWicket).map((ball) => ball.strikerId)
    );

    return battingTeam.players
      .map((player) => player.id)
      .filter((playerId) => !dismissedBatterIds.has(playerId))
      .filter((playerId) => playerId !== innings.strikerId)
      .filter((playerId) => playerId !== innings.nonStrikerId);
  }, [battingTeam, innings]);

  const canAddNewBatterToTeam = useMemo(() => {
    if (!battingTeam) {
      return false;
    }

    return battingTeam.players.length < 11;
  }, [battingTeam]);

  const needsNextBowlerSelection = useMemo(() => {
    if (!innings || innings.completed) {
      return false;
    }

    return innings.legalBalls > 0 && innings.legalBalls % 6 === 0;
  }, [innings]);

  const overGroups = useMemo(() => {
    if (!innings) {
      return [];
    }

    return groupBallsByOver(innings.balls);
  }, [innings]);

  const inningsScorecards = useMemo(() => {
    if (!match) {
      return [];
    }

    return match.innings.map((inningsCard) => buildInningsScorecard(inningsCard, teams));
  }, [match, teams]);

  useEffect(() => {
    if (!isWicket) {
      return;
    }

    setNextBatterId((prev) => prev || eligibleNextBatterIds[0] || "");
  }, [eligibleNextBatterIds, isWicket]);

  useEffect(() => {
    if (!needsNextBowlerSelection || !bowlingTeam || !innings) {
      return;
    }

    const fallback =
      bowlingTeam.players.find((player) => player.id !== innings.currentBowlerId)?.id ??
      bowlingTeam.players[0]?.id ??
      "";
    setNextBowlerId((prev) => prev || fallback);
  }, [bowlingTeam, innings, needsNextBowlerSelection]);

  async function createNewBatter(): Promise<void> {
    if (!battingTeam) {
      return;
    }

    const payload: TeamPlayerCreateInput = {
      name: newBatterName.trim(),
      role: newBatterRole,
    };

    if (!payload.name) {
      setError("Enter new batter name.");
      return;
    }

    try {
      setCreatingPlayer(true);
      setError(null);
      const response = await postJson<{ player: { id: string } }>(
        `/api/teams/${battingTeam.id}/players`,
        payload
      );
      setNextBatterId(response.player.id);
      setNewBatterName("");
      await loadMatch();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to add new batter."
      );
    } finally {
      setCreatingPlayer(false);
    }
  }

  async function submitBall(): Promise<void> {
    if (!match || !innings) {
      return;
    }

    if (match.status !== "live") {
      setError("Match is already completed.");
      return;
    }

    const projectedWickets = innings.wickets + (isWicket ? 1 : 0);
    if (isWicket && projectedWickets < 10 && !nextBatterId) {
      setError("Select next batter.");
      return;
    }

    if (needsNextBowlerSelection && !nextBowlerId) {
      setError("Select next bowler before starting this over.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await postJson<MatchResponse>(`/api/matches/${match.id}/score`, {
        runsOffBat,
        extraRuns,
        extraType,
        isWicket,
        wicketType: isWicket ? wicketType : null,
        nextBatterId: isWicket ? nextBatterId : undefined,
        nextBowlerId: needsNextBowlerSelection ? nextBowlerId : undefined,
      });

      setRunsOffBat(0);
      setExtraRuns(0);
      setExtraType("none");
      setIsWicket(false);
      if (needsNextBowlerSelection) {
        setNextBowlerId("");
      }

      await loadMatch();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Scoring failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading scoreboard...</p>;
  }

  if (!match || !innings || !battingTeam || !bowlingTeam) {
    return <p className="text-sm text-destructive">Match details unavailable.</p>;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2">
        {match.innings.map((inningsCard, index) => (
          <div key={`${match.id}-summary-${index}`} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              Innings {index + 1} • {getTeamName(teams, inningsCard.battingTeamId)}
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {inningsCard.runs}/{inningsCard.wickets}
            </p>
            <p className="text-sm text-muted-foreground">
              Overs {toOversString(inningsCard.legalBalls)} • RR {createRunRate(inningsCard.runs, inningsCard.legalBalls)}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            Live: {getTeamName(teams, innings.battingTeamId)} batting
          </h2>
          <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
            {match.status.toUpperCase()}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">On Strike</p>
            <p className="mt-1 text-lg font-semibold">{getPlayerName(teams, innings.strikerId)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Non-striker</p>
            <p className="font-medium">{getPlayerName(teams, innings.nonStrikerId)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Current bowler</p>
            <p className="font-medium">{getPlayerName(teams, innings.currentBowlerId)}</p>
          </div>
        </div>

        {needsNextBowlerSelection ? (
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-sm font-medium text-primary">Over completed. Select next bowler to continue.</p>
            <select
              className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={nextBowlerId}
              onChange={(event) => setNextBowlerId(event.target.value)}
            >
              <option value="">Select next bowler</option>
              {bowlingTeam.players
                .filter((player) => player.id !== innings.currentBowlerId)
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
            </select>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <div>
            <p className="mb-2 text-sm font-medium">Runs off bat</p>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 6].map((run) => (
                <Button
                  key={`run-${run}`}
                  type="button"
                  variant={runsOffBat === run ? "default" : "outline"}
                  onClick={() => setRunsOffBat(run)}
                >
                  {run}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={extraType}
              onChange={(event) => setExtraType(event.target.value as ExtraType)}
            >
              <option value="none">No Extra</option>
              <option value="wide">Wide</option>
              <option value="no-ball">No Ball</option>
              <option value="bye">Bye</option>
              <option value="leg-bye">Leg Bye</option>
            </select>
            <input
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              type="number"
              min={0}
              max={6}
              value={extraRuns}
              onChange={(event) => setExtraRuns(Number(event.target.value) || 0)}
            />
            <label className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
              <input
                type="checkbox"
                checked={isWicket}
                onChange={(event) => setIsWicket(event.target.checked)}
              />
              Wicket
            </label>
          </div>

          {isWicket ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={wicketType}
                onChange={(event) => setWicketType(event.target.value as WicketType)}
              >
                {wicketTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {eligibleNextBatterIds.length > 0 ? (
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={nextBatterId}
                  onChange={(event) => setNextBatterId(event.target.value)}
                >
                  <option value="">Select next batter</option>
                  {eligibleNextBatterIds.map((playerId) => (
                    <option key={playerId} value={playerId}>
                      {getPlayerName(teams, playerId)}
                    </option>
                  ))}
                </select>
              ) : canAddNewBatterToTeam ? (
                <div className="space-y-2 rounded-md border p-2 sm:col-span-1">
                  <p className="text-xs text-muted-foreground">
                    No bench batter available. Add new batter to this team (max 11).
                  </p>
                  <input
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    placeholder="New batter name"
                    value={newBatterName}
                    onChange={(event) => setNewBatterName(event.target.value)}
                  />
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={newBatterRole}
                    onChange={(event) =>
                      setNewBatterRole(event.target.value as TeamPlayerCreateInput["role"])
                    }
                  >
                    <option value="batter">Batter</option>
                    <option value="all-rounder">All-rounder</option>
                    <option value="wicket-keeper">Wicket-keeper</option>
                    <option value="bowler">Bowler</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={creatingPlayer}
                    onClick={() => void createNewBatter()}
                  >
                    Add Batter to Team
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-destructive sm:col-span-1">
                  Team already has 11 players and no next batter is available.
                </p>
              )}
            </div>
          ) : null}

          <Button type="button" disabled={submitting || match.status !== "live"} onClick={() => void submitBall()}>
            Record Ball
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-medium">Ball-by-ball (Over wise)</p>
        {overGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No balls recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {overGroups.map((group) => (
              <div key={`over-${group.over}`} className="rounded-md border p-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Over {group.over + 1}</p>
                <div className="flex flex-wrap gap-2">
                  {group.balls.map((ball) => (
                    <span key={ball.id} className="rounded-md border px-2 py-1 text-xs">
                      {ball.over}.{ball.ballInOver} {formatBallChip(ball)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-base font-semibold">Overall Scorecard</h3>
        <div className="mt-4 space-y-5">
          {match.innings.map((inningsCard, index) => {
            const scorecard = inningsScorecards[index];
            return (
              <div key={`scorecard-${index}`} className="rounded-lg border p-3">
                <p className="text-sm font-semibold">
                  Innings {index + 1}: {getTeamName(teams, inningsCard.battingTeamId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inningsCard.runs}/{inningsCard.wickets} in {toOversString(inningsCard.legalBalls)} overs
                </p>

                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Batting</p>
                    <div className="space-y-1 text-sm">
                      {scorecard.batters.length === 0 ? (
                        <p className="text-muted-foreground">No batting data yet.</p>
                      ) : (
                        scorecard.batters.map((batter) => (
                          <div key={batter.playerId} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1">
                            <span className="truncate">{batter.name}</span>
                            <span className="text-xs text-muted-foreground">{batter.runs}({batter.balls})</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Bowling</p>
                    <div className="space-y-1 text-sm">
                      {scorecard.bowlers.length === 0 ? (
                        <p className="text-muted-foreground">No bowling data yet.</p>
                      ) : (
                        scorecard.bowlers.map((bowler) => (
                          <div key={bowler.playerId} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1">
                            <span className="truncate">{bowler.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {toOversString(bowler.balls)} • {bowler.runs}/{bowler.wickets}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
