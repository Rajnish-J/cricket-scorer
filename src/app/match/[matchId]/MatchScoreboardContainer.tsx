"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getJson, postJson } from "@/lib/api-client";
import { createRunRate, currentInningsIndex, toOversString } from "@/lib/match-utils";
import type { MatchResponse } from "@/types/api";
import type { ExtraType, Match, Team, WicketType } from "@/types/scorer";

interface MatchScoreboardContainerProps {
  matchId: string;
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

  useEffect(() => {
    if (!innings) {
      return;
    }

    setNextBatterId((prev) => prev || innings.yetToBatIds[0] || "");
  }, [innings]);

  const willCompleteOver = useMemo(() => {
    if (!innings) {
      return false;
    }

    if (!isLegalDelivery(extraType)) {
      return false;
    }

    const projectedLegalBalls = innings.legalBalls + 1;
    return projectedLegalBalls % 6 === 0;
  }, [extraType, innings]);

  useEffect(() => {
    if (!willCompleteOver || !bowlingTeam || !innings) {
      return;
    }

    const fallback =
      bowlingTeam.players.find((player) => player.id !== innings.currentBowlerId)?.id ??
      bowlingTeam.players[0]?.id ??
      "";
    setNextBowlerId((prev) => prev || fallback);
  }, [bowlingTeam, innings, willCompleteOver]);

  async function submitBall(): Promise<void> {
    if (!match || !innings) {
      return;
    }

    if (match.status !== "live") {
      setError("Match is already completed.");
      return;
    }

    if (isWicket && innings.yetToBatIds.length > 0 && !nextBatterId) {
      setError("Select next batter.");
      return;
    }

    if (willCompleteOver && !nextBowlerId) {
      setError("Select next bowler for the upcoming over.");
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
        nextBowlerId: willCompleteOver ? nextBowlerId : undefined,
      });

      setRunsOffBat(0);
      setExtraRuns(0);
      setExtraType("none");
      setIsWicket(false);
      setNextBowlerId("");

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
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Striker</p>
            <p className="font-medium">{getPlayerName(teams, innings.strikerId)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Non-striker</p>
            <p className="font-medium">{getPlayerName(teams, innings.nonStrikerId)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Bowler</p>
            <p className="font-medium">{getPlayerName(teams, innings.currentBowlerId)}</p>
          </div>
        </div>

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

              {innings.yetToBatIds.length > 0 ? (
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={nextBatterId}
                  onChange={(event) => setNextBatterId(event.target.value)}
                >
                  <option value="">Select next batter</option>
                  {innings.yetToBatIds.map((playerId) => (
                    <option key={playerId} value={playerId}>
                      {getPlayerName(teams, playerId)}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ) : null}

          {willCompleteOver ? (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Over completion detected. Select next bowler.
              </p>
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={nextBowlerId}
                onChange={(event) => setNextBowlerId(event.target.value)}
              >
                <option value="">Select next bowler</option>
                {bowlingTeam.players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <Button type="button" disabled={submitting || match.status !== "live"} onClick={() => void submitBall()}>
            Record Ball
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Ball-by-ball</p>
        <div className="flex flex-wrap gap-2">
          {innings.balls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No balls recorded yet.</p>
          ) : (
            innings.balls.slice(-30).map((ball) => (
              <span key={ball.id} className="rounded-md border px-2 py-1 text-xs">
                {ball.over}.{ball.ballInOver} {ball.totalRuns}
                {ball.isWicket ? "W" : ""}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

