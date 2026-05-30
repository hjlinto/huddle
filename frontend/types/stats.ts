/**
 * Stats type contracts.
 *
 * Owns shared TypeScript types for prediction statistics.
 */

export type RecordBlock = {
  wins: number;
  losses: number;
  pushes: number;
  total: number;
  win_pct: number;
};

export type StatsResponse = {
  league?: string;
  counts: { predictions: number };
  winner: RecordBlock;
  ats: RecordBlock;
  total: RecordBlock;
  season: number | null;
  week: number | null;
};

export type League = "nfl" | "ncaaf";
export type LeagueFilter = League | "both";
export type WeekMode = "overall" | "single" | "by_week";

export type WeeklyStatsRow = {
  week: number;
  stats: StatsResponse;
};