import type {
  BallEvent,
  InningsState,
  Match,
  Player,
  PlayerAggregateStats,
  Team,
  WicketType,
} from "@/types/scorer";
import type { MatchCreateInput, ScoreEventInput } from "@/lib/scorer-schema";
import { createId } from "@/lib/store";

function isLegalDelivery(extraType: BallEvent["extraType"]): boolean {
  return extraType !== "wide" && extraType !== "no-ball";
}

function toOverBall(legalBalls: number): { over: number; ballInOver: number } {
  return {
    over: Math.floor(legalBalls / 6),
    ballInOver: (legalBalls % 6) + 1,
  };
}

function swapBatters(innings: InningsState): void {
  const temp = innings.strikerId;
  innings.strikerId = innings.nonStrikerId;
  innings.nonStrikerId = temp;
}

function createInnings(
  battingTeamId: string,
  bowlingTeamId: string,
  overs: number,
  strikerId: string,
  nonStrikerId: string,
  bowlerId: string,
  battingPlayerIds: string[]
): InningsState {
  const yetToBatIds = battingPlayerIds.filter(
    (playerId) => playerId !== strikerId && playerId !== nonStrikerId
  );

  return {
    battingTeamId,
    bowlingTeamId,
    oversLimit: overs,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    completed: false,
    strikerId,
    nonStrikerId,
    currentBowlerId: bowlerId,
    yetToBatIds,
    balls: [],
  };
}

function chooseBattingAndBowlingTeamIds(
  setup: MatchCreateInput
): { battingFirstTeamId: string; bowlingFirstTeamId: string } {
  if (setup.tossDecision === "bat") {
    return {
      battingFirstTeamId: setup.tossWinnerTeamId,
      bowlingFirstTeamId:
        setup.tossWinnerTeamId === setup.teamAId ? setup.teamBId : setup.teamAId,
    };
  }

  return {
    battingFirstTeamId:
      setup.tossWinnerTeamId === setup.teamAId ? setup.teamBId : setup.teamAId,
    bowlingFirstTeamId: setup.tossWinnerTeamId,
  };
}

function getTeamPlayersByTeamId(teams: Team[], teamId: string): Player[] {
  const team = teams.find((candidate) => candidate.id === teamId);
  return team?.players ?? [];
}

function concludeMatch(match: Match): void {
  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];

  match.status = "completed";
  match.completedAt = new Date().toISOString();

  if (firstInnings.runs > secondInnings.runs) {
    match.winnerTeamId = firstInnings.battingTeamId;
    return;
  }

  if (secondInnings.runs > firstInnings.runs) {
    match.winnerTeamId = secondInnings.battingTeamId;
    return;
  }

  match.winnerTeamId = null;
}

function startSecondInnings(match: Match, teams: Team[]): void {
  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];

  if (secondInnings.legalBalls > 0 || secondInnings.balls.length > 0) {
    return;
  }

  const battingPlayers = getTeamPlayersByTeamId(teams, secondInnings.battingTeamId);
  const bowlingPlayers = getTeamPlayersByTeamId(teams, secondInnings.bowlingTeamId);

  const fallbackStriker = battingPlayers[0]?.id ?? "";
  const fallbackNonStriker = battingPlayers[1]?.id ?? fallbackStriker;
  const fallbackBowler = bowlingPlayers[0]?.id ?? "";

  secondInnings.strikerId = secondInnings.strikerId || fallbackStriker;
  secondInnings.nonStrikerId = secondInnings.nonStrikerId || fallbackNonStriker;
  secondInnings.currentBowlerId = secondInnings.currentBowlerId || fallbackBowler;
  secondInnings.yetToBatIds = battingPlayers
    .map((player) => player.id)
    .filter(
      (playerId) =>
        playerId !== secondInnings.strikerId && playerId !== secondInnings.nonStrikerId
    );

  match.target = firstInnings.runs + 1;
}

function shouldEndInnings(
  innings: InningsState,
  opposingTarget: number | null,
  teamPlayerCount: number
): boolean {
  if (innings.wickets >= Math.max(0, teamPlayerCount - 1)) {
    return true;
  }

  if (innings.legalBalls >= innings.oversLimit * 6) {
    return true;
  }

  if (opposingTarget !== null && innings.runs >= opposingTarget) {
    return true;
  }

  return false;
}

export function buildMatch(setup: MatchCreateInput, teams: Team[]): Match {
  const now = new Date().toISOString();
  const { battingFirstTeamId, bowlingFirstTeamId } = chooseBattingAndBowlingTeamIds(setup);

  const firstBattingPlayers = getTeamPlayersByTeamId(teams, battingFirstTeamId).map(
    (player) => player.id
  );
  const secondBattingPlayers = getTeamPlayersByTeamId(teams, bowlingFirstTeamId).map(
    (player) => player.id
  );

  const secondInningsStriker = secondBattingPlayers[0] ?? "";
  const secondInningsNonStriker = secondBattingPlayers[1] ?? secondInningsStriker;
  const secondInningsBowler = firstBattingPlayers[0] ?? "";

  return {
    id: createId("match"),
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    completedAt: null,
    status: "live",
    format: setup.format,
    overs: setup.overs,
    venue: setup.venue,
    tossWinnerTeamId: setup.tossWinnerTeamId,
    tossDecision: setup.tossDecision,
    teamAId: setup.teamAId,
    teamBId: setup.teamBId,
    target: null,
    innings: [
      createInnings(
        battingFirstTeamId,
        bowlingFirstTeamId,
        setup.overs,
        setup.openingStrikerId,
        setup.openingNonStrikerId,
        setup.openingBowlerId,
        firstBattingPlayers
      ),
      createInnings(
        bowlingFirstTeamId,
        battingFirstTeamId,
        setup.overs,
        secondInningsStriker,
        secondInningsNonStriker,
        secondInningsBowler,
        secondBattingPlayers
      ),
    ],
    winnerTeamId: null,
  };
}

export function recordBall(
  match: Match,
  payload: ScoreEventInput,
  teams: Team[]
): { ok: true } | { ok: false; message: string } {
  if (match.status !== "live") {
    return { ok: false, message: "Only live matches can be updated." };
  }

  const firstInnings = match.innings[0];
  const inningsIndex = firstInnings.completed ? 1 : 0;
  const innings = match.innings[inningsIndex];

  if (innings.completed) {
    return { ok: false, message: "Current innings is already completed." };
  }

  const currentBattingPlayers = getTeamPlayersByTeamId(teams, innings.battingTeamId);
  const legalDelivery = isLegalDelivery(payload.extraType);
  const previousLegalBalls = innings.legalBalls;
  const currentOver = toOverBall(previousLegalBalls);

  const ballEvent: BallEvent = {
    id: createId("ball"),
    inningsNumber: inningsIndex === 0 ? 1 : 2,
    over: currentOver.over,
    ballInOver: currentOver.ballInOver,
    runsOffBat: payload.runsOffBat,
    extraRuns: payload.extraRuns,
    extraType: payload.extraType,
    isWicket: payload.isWicket,
    wicketType: payload.wicketType ?? null,
    strikerId: innings.strikerId,
    nonStrikerId: innings.nonStrikerId,
    bowlerId: innings.currentBowlerId,
    totalRuns: payload.runsOffBat + payload.extraRuns,
    createdAt: new Date().toISOString(),
  };

  innings.runs += ballEvent.totalRuns;
  innings.balls.push(ballEvent);

  if (legalDelivery) {
    innings.legalBalls += 1;
  }

  if (payload.isWicket) {
    innings.wickets += 1;

    if (innings.yetToBatIds.length > 0) {
      if (!payload.nextBatterId) {
        return {
          ok: false,
          message: "Select next batter after wicket when players are available.",
        };
      }

      const nextBatterExists = innings.yetToBatIds.includes(payload.nextBatterId);
      if (!nextBatterExists) {
        return { ok: false, message: "Selected next batter is invalid." };
      }

      innings.strikerId = payload.nextBatterId;
      innings.yetToBatIds = innings.yetToBatIds.filter(
        (playerId) => playerId !== payload.nextBatterId
      );
    }
  }

  if (!payload.isWicket && ballEvent.totalRuns % 2 === 1) {
    swapBatters(innings);
  }

  const overCompleted = legalDelivery && innings.legalBalls > 0 && innings.legalBalls % 6 === 0;
  if (overCompleted) {
    swapBatters(innings);

    if (payload.nextBowlerId) {
      innings.currentBowlerId = payload.nextBowlerId;
    }
  }

  const targetForInnings = inningsIndex === 1 ? match.target : null;
  if (shouldEndInnings(innings, targetForInnings, currentBattingPlayers.length)) {
    innings.completed = true;

    if (inningsIndex === 0) {
      startSecondInnings(match, teams);
    } else {
      concludeMatch(match);
    }
  }

  match.updatedAt = new Date().toISOString();

  if (match.innings[0].completed && match.innings[1].completed && match.status !== "completed") {
    concludeMatch(match);
  }

  return { ok: true };
}

export function formatOvers(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function createEmptyStats(playerId: string): PlayerAggregateStats {
  return {
    playerId,
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
}

function addWicketToBowler(wicketType: WicketType | null, stats: PlayerAggregateStats): void {
  if (!wicketType) {
    return;
  }

  if (wicketType === "run-out") {
    return;
  }

  stats.wickets += 1;
}

export function aggregatePlayerStats(
  teamId: string,
  playerId: string,
  matches: Match[]
): PlayerAggregateStats {
  const stats = createEmptyStats(playerId);

  const completedMatches = matches.filter(
    (match) =>
      match.status === "completed" &&
      (match.teamAId === teamId || match.teamBId === teamId)
  );

  for (const match of completedMatches) {
    stats.matches += 1;

    for (const innings of match.innings) {
      for (const ball of innings.balls) {
        if (ball.strikerId === playerId) {
          stats.battingRuns += ball.runsOffBat;
          if (isLegalDelivery(ball.extraType)) {
            stats.battingBalls += 1;
          }
          if (ball.runsOffBat === 4) {
            stats.fours += 1;
          }
          if (ball.runsOffBat === 6) {
            stats.sixes += 1;
          }
          if (ball.isWicket) {
            stats.outs += 1;
          }
        }

        if (ball.bowlerId === playerId) {
          stats.bowlingRuns += ball.totalRuns;
          if (isLegalDelivery(ball.extraType)) {
            stats.bowlingBalls += 1;
          }
          if (ball.isWicket) {
            addWicketToBowler(ball.wicketType, stats);
          }
        }
      }
    }
  }

  return stats;
}

