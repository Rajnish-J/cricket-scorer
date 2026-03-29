import type { Match } from "@/types/scorer";

export function toOversString(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

export function currentInningsIndex(match: Match): 0 | 1 {
  return match.innings[0].completed ? 1 : 0;
}

export function createRunRate(runs: number, legalBalls: number): string {
  if (legalBalls === 0) {
    return "0.00";
  }

  const overs = legalBalls / 6;
  return (runs / overs).toFixed(2);
}

