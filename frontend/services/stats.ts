/**
 * Stats service.
 *
 * Owns backend communication and aggregation helpers for user statistics.
 */

import { apiFetch } from "@/services/api";
import type { League, RecordBlock, StatsResponse } from "@/types/stats";

const USERS_PREFIX = "/api/users";

export async function fetchUserStats(
  league: League,
  season: number,
  week?: number
): Promise<StatsResponse> {
  const params = new URLSearchParams();

  params.set("season", String(season));

  if (week !== undefined) {
    params.set("week", String(week));
  }

  return apiFetch(
    `${USERS_PREFIX}/${league}/me/stats?${params.toString()}`
  ) as Promise<StatsResponse>;
}

export function combineStats(
  first: StatsResponse,
  second: StatsResponse
): StatsResponse {
  return {
    league: "both",
    counts: {
      predictions: first.counts.predictions + second.counts.predictions,
    },
    winner: combineRecordBlocks(first.winner, second.winner),
    ats: combineRecordBlocks(first.ats, second.ats),
    total: combineRecordBlocks(first.total, second.total),
    season: first.season ?? second.season,
    week: first.week ?? second.week,
  };
}

function combineRecordBlocks(
  first: RecordBlock,
  second: RecordBlock
): RecordBlock {
  const wins = first.wins + second.wins;
  const losses = first.losses + second.losses;
  const pushes = first.pushes + second.pushes;
  const total = first.total + second.total;

  return {
    wins,
    losses,
    pushes,
    total,
    win_pct: total ? wins / total : 0,
  };
}