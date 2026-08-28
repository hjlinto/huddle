/**
 * Weekly picks type contracts.
 *
 * Owns shared TypeScript types for games, odds, and user predictions.
 */

export type League = "nfl" | "ncaaf";

export type Odds = {
  spread: number | null;
  total: number | null;
};

export type Game = {
  id: number;
  league: League;
  season: number;
  week: number;
  game_date?: string;
  game_time?: string | null;
  source?: string | null;
  source_event_id?: string | null;
  home_team: string;
  away_team: string;
  home_rank?: number | null;
  away_rank?: number | null;
  home_record?: string | null;
  away_record?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  home_team_wins?: boolean | null;
  is_final?: boolean;
};

export type Pick = {
  predicted_winner: "" | "home" | "away";
  predicted_spread: "" | "home" | "away";
  predicted_total: "" | "over" | "under";
};

export type Prediction = {
  id: number;
  user_id: number;
  game_id: number;
  predicted_winner: "home" | "away";
  predicted_spread: "home" | "away" | null;
  predicted_total: "over" | "under" | null;
  winner_correct?: boolean | null;
  spread_correct?: boolean | null;
  total_correct?: boolean | null;
  graded_at?: string | null;
};

export type WeekGame = {
  game: Game;
  odds: Odds | null;
  my_prediction: Prediction | null;
};

export type UserWeekResponse = {
  league: League;
  season: number;
  week: number;
  games: WeekGame[];
};

export type DisplayGame = Game & {
  odds: Odds | null;
};
