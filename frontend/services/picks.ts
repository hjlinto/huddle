/**
 * Weekly picks service.
 *
 * Owns backend communication for loading weekly games and saving picks.
 */

import { apiFetch } from "@/services/api";
import type {
  DisplayGame,
  League,
  Pick,
  Prediction,
  UserWeekResponse,
} from "@/types/picks";

export async function fetchUserWeek(
  league: League,
  season: number,
  week: number
): Promise<UserWeekResponse> {
  return apiFetch(`/api/weeks/${league}/${season}/${week}/me`) as Promise<UserWeekResponse>;
}

export async function createPrediction(
  gameId: number,
  pick: Pick
): Promise<Prediction> {
  return apiFetch("/api/predictions/", {
    method: "POST",
    body: JSON.stringify({
      game_id: gameId,
      predicted_winner: pick.predicted_winner,
      predicted_spread: pick.predicted_spread || null,
      predicted_total: pick.predicted_total || null,
    }),
  }) as Promise<Prediction>;
}

export async function updatePrediction(
  predictionId: number,
  pick: Pick
): Promise<Prediction> {
  return apiFetch(`/api/predictions/${predictionId}`, {
    method: "PUT",
    body: JSON.stringify({
      predicted_winner: pick.predicted_winner,
      predicted_spread: pick.predicted_spread || null,
      predicted_total: pick.predicted_total || null,
    }),
  }) as Promise<Prediction>;
}

export function normalizeWeekGames(response: UserWeekResponse): DisplayGame[] {
  return response.games.map((row) => ({
    ...row.game,
    odds: row.odds ?? null,
  }));
}

export function buildPickState(response: UserWeekResponse): {
  picks: Record<number, Pick>;
  predictionIds: Record<number, number>;
} {
  const picks: Record<number, Pick> = {};
  const predictionIds: Record<number, number> = {};

  for (const row of response.games) {
    const gameId = row.game.id;
    const prediction = row.my_prediction;

    picks[gameId] = prediction
      ? {
          predicted_winner: prediction.predicted_winner ?? "",
          predicted_spread: prediction.predicted_spread ?? "",
          predicted_total: prediction.predicted_total ?? "",
        }
      : {
          predicted_winner: "",
          predicted_spread: "",
          predicted_total: "",
        };

    if (prediction?.id) {
      predictionIds[gameId] = prediction.id;
    }
  }

  return { picks, predictionIds };
}