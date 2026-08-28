"use client";

/**
 * Weekly picks page.
 *
 * Owns game filters, prediction entry state, and autosave interactions.
 */

import { useEffect, useRef, useState } from "react";

import { getToken } from "@/services/auth";
import {
  buildPickState,
  createPrediction,
  fetchUserWeek,
  normalizeWeekGames,
  updatePrediction,
} from "@/services/picks";
import type { DisplayGame, League, Pick } from "@/types/picks";

const seasons = [2026, 2025, 2024];
const weeks = Array.from({ length: 18 }, (_, index) => index + 1);

const emptyPick: Pick = {
  predicted_winner: "",
  predicted_spread: "",
  predicted_total: "",
};

const selectClass =
  "h-11 min-w-28 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200";

export default function PicksPage() {
  const [league, setLeague] = useState<League>("ncaaf");
  const [season, setSeason] = useState<number>(2026);
  const [week, setWeek] = useState<number>(1);

  const [games, setGames] = useState<DisplayGame[]>([]);
  const [picks, setPicks] = useState<Record<number, Pick>>({});
  const [predictionIds, setPredictionIds] = useState<Record<number, number>>({});
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
    }
  }, []);

  async function loadWeek() {
    setIsLoading(true);
    setStatus("Loading week...");

    try {
      const response = await fetchUserWeek(league, season, week);
      const normalizedGames = normalizeWeekGames(response);
      const nextState = buildPickState(response);

      setGames(normalizedGames);
      setPicks(nextState.picks);
      setPredictionIds(nextState.predictionIds);

      setStatus(
        `Loaded ${normalizedGames.length} games for ${league.toUpperCase()} ${season} Week ${week}.`
      );
    } catch (error) {
      console.error(error);
      setStatus(
        `Failed to load week: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updatePick(gameId: number, patch: Partial<Pick>) {
    setPicks((previous) => {
      const nextPick = {
        ...(previous[gameId] ?? emptyPick),
        ...patch,
      };

      scheduleAutosave(gameId, nextPick);

      return {
        ...previous,
        [gameId]: nextPick,
      };
    });
  }

  function scheduleAutosave(gameId: number, pick: Pick) {
    if (pick.predicted_winner === "") {
      return;
    }

    if (saveTimers.current[gameId]) {
      clearTimeout(saveTimers.current[gameId]);
    }

    saveTimers.current[gameId] = setTimeout(() => {
      void savePick(gameId, pick);
    }, 400);
  }

  async function savePick(gameId: number, pick: Pick) {
    try {
      const existingPredictionId = predictionIds[gameId];

      if (existingPredictionId) {
        await updatePrediction(existingPredictionId, pick);
        setStatus("Picks saved.");
        return;
      }

      const createdPrediction = await createPrediction(gameId, pick);

      if (createdPrediction.id) {
        setPredictionIds((previous) => ({
          ...previous,
          [gameId]: createdPrediction.id,
        }));
      }

      setStatus("Picks saved.");
    } catch (error) {
      console.error(error);
      setStatus(
        `Failed to save pick: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Weekly prediction dashboard
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Make picks across NFL and college football.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Load weekly matchups, review spread and total lines, then submit
              winner, spread, and over/under picks. Changes autosave to your account.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:min-w-[420px]">
            <Metric label="League" value={league.toUpperCase()} />
            <Metric label="Season" value={String(season)} />
            <Metric label="Week" value={String(week)} />
          </div>
        </div>

        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-600">League</span>
              <select
                value={league}
                onChange={(event) => setLeague(event.target.value as League)}
                className={selectClass}
              >
                <option value="nfl">NFL</option>
                <option value="ncaaf">NCAAF</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-600">Season</span>
              <select
                value={season}
                onChange={(event) => setSeason(Number(event.target.value))}
                className={selectClass}
              >
                {seasons.map((seasonOption) => (
                  <option key={seasonOption} value={seasonOption}>
                    {seasonOption}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-600">Week</span>
              <select
                value={week}
                onChange={(event) => setWeek(Number(event.target.value))}
                className={selectClass}
              >
                {weeks.map((weekOption) => (
                  <option key={weekOption} value={weekOption}>
                    Week {weekOption}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={loadWeek}
              disabled={false}
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-md hover:bg-blue-700"
            >
              {isLoading ? "Loading..." : "Load Week"}
            </button>
          </div>

          {status && (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              {status}
            </div>
          )}
        </section>

        {games.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              No games loaded yet
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Choose a league, season, and week, then load the slate.
            </p>
          </section>
        ) : (
          <div className="grid gap-5">
            {games.map((game) => {
              const pick = picks[game.id] ?? emptyPick;
              const hasPick =
                pick.predicted_winner ||
                pick.predicted_spread ||
                pick.predicted_total;

              return (
                <section
                  key={game.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-100 p-6">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {league.toUpperCase()} Week {week}
                        </span>
                        {hasPick && (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            Picks saved
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                        {formatTeam(game.away_rank, game.away_team)}{" "}
                        <span className="text-slate-400">at</span>{" "}
                        {formatTeam(game.home_rank, game.home_team)}
                      </h2>

                      <p className="mt-2 text-sm font-medium text-slate-500">
                        {formatGameDateTime(game)}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        {game.away_record ?? "Away record TBD"}{" "}
                        <span className="text-slate-400">/</span>{" "}
                        {game.home_record ?? "Home record TBD"}
                      </p>
                    </div>

                    <div className="grid min-w-48 grid-cols-2 gap-3">
                      <LineStat label="Spread" value={game.odds?.spread ?? "N/A"} />
                      <LineStat label="Total" value={game.odds?.total ?? "N/A"} />
                    </div>
                  </div>

                  <div className="grid gap-4 p-6 md:grid-cols-3">
                    <PickSelect
                      label="Winner"
                      value={pick.predicted_winner}
                      onChange={(value) =>
                        updatePick(game.id, {
                          predicted_winner: value as Pick["predicted_winner"],
                        })
                      }
                      options={[
                        { value: "", label: "Select winner" },
                        { value: "away", label: game.away_team },
                        { value: "home", label: game.home_team },
                      ]}
                    />

                    <PickSelect
                      label="Against the spread"
                      value={pick.predicted_spread}
                      onChange={(value) =>
                        updatePick(game.id, {
                          predicted_spread: value as Pick["predicted_spread"],
                        })
                      }
                      options={[
                        { value: "", label: "Select spread pick" },
                        { value: "away", label: game.away_team },
                        { value: "home", label: game.home_team },
                      ]}
                    />

                    <PickSelect
                      label="Total"
                      value={pick.predicted_total}
                      onChange={(value) =>
                        updatePick(game.id, {
                          predicted_total: value as Pick["predicted_total"],
                        })
                      }
                      options={[
                        { value: "", label: "Select total pick" },
                        { value: "over", label: "Over" },
                        { value: "under", label: "Under" },
                      ]}
                    />
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function formatGameDateTime(game: DisplayGame): string {
  if (!game.game_date) {
    return "Date TBD";
  }

  if (!game.game_time) {
    return game.game_date;
  }

  return `${game.game_date} ${formatGameTime(game.game_time)}`;
}

function formatGameTime(gameTime: string): string {
  const [hours, minutes] = gameTime.split(":");
  const parsedHours = Number(hours);
  const suffix = parsedHours >= 12 ? "PM" : "AM";
  const displayHours = parsedHours % 12 || 12;

  return `${displayHours}:${minutes} ${suffix}`;
}

function formatTeam(rank: number | null | undefined, team: string): string {
  return rank ? `#${rank} ${team}` : team;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 whitespace-nowrap text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function LineStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PickSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
