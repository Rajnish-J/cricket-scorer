import type { MatchFormat } from "@/types/scorer";

export interface MatchPreset {
  format: MatchFormat;
  label: string;
  overs: number;
}

export const MATCH_PRESETS: MatchPreset[] = [
  { format: "T10", label: "T10", overs: 10 },
  { format: "T20", label: "T20", overs: 20 },
  { format: "ODI", label: "ODI", overs: 50 },
  { format: "TEST", label: "Test", overs: 90 },
  { format: "CUSTOM", label: "Custom", overs: 20 },
];

