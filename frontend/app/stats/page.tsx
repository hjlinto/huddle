"use client";

/**
 * Stats page.
 *
 * Owns stats filters, page state, and statistics presentation.
 */

import { useEffect, useState } from "react";

import { getToken } from "@/services/auth";
import { combineStats, fetchUserStats } from "@/services/stats";
import type {
  League,
  LeagueFilter,
  RecordBlock,
  StatsResponse,
  WeekMode,
  WeeklyStatsRow,
} from "@/types/stats";

const selectClass =
  "h-11 min-w-32 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200";

function pct(value: number): string {
  if (!Number.isFinite(value)) {
    return "0.0%";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function fmtRecord(block: RecordBlock): string {
  return `${block.wins}-${block.losses}-${block.pushes} (${pct(
    block.win_pct
  )})`;
}

function StatCard({
  title,
  block,
}: {
  title: string;
  block: RecordBlock;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Category
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Win %
          </p>
          <p className="text-2xl font-bold">{pct(block.win_pct)}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MiniStat label="Wins" value={block.wins} />
        <MiniStat label="Losses" value={block.losses} />
        <MiniStat label="Pushes" value={block.pushes} />
        <MiniStat label="Total" value={block.total} />
      </div>
    </section>
  );
}

export default function StatsPage() {
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>("nfl");
  const [weekMode, setWeekMode] = useState<WeekMode>("overall");

  const [season, setSeason] = useState<number>(2025);
  const [week, setWeek] = useState<number>(1);
  const [maxWeek, setMaxWeek] = useState<number>(18);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyStatsRow[]>([]);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
    }
  }, []);

  async function loadStats() {
    setStatus("Loading stats...");
    setStats(null);
    setWeeklyRows([]);

    try {
      const leagues: League[] =
        leagueFilter === "both" ? ["nfl", "ncaaf"] : [leagueFilter];

      const loadOne = async (selectedWeek?: number) => {
        const results = await Promise.all(
          leagues.map((league) => fetchUserStats(league, season, selectedWeek))
        );

        return results.length === 2
          ? combineStats(results[0], results[1])
          : results[0];
      };

      if (weekMode === "overall") {
        const combined = await loadOne();

        setStats(combined);
        setStatus(
          `Loaded overall stats for ${leagueFilter.toUpperCase()} — Season ${season}.`
        );

        return;
      }

      if (weekMode === "single") {
        const combined = await loadOne(week);

        setStats(combined);
        setStatus(
          `Loaded Week ${week} stats for ${leagueFilter.toUpperCase()} — Season ${season}.`
        );

        return;
      }

      const rows: WeeklyStatsRow[] = [];

      for (let selectedWeek = 1; selectedWeek <= maxWeek; selectedWeek++) {
        try {
          const combined = await loadOne(selectedWeek);

          rows.push({
            week: selectedWeek,
            stats: combined,
          });
        } catch {
          // Missing week data should not prevent the rest of the
          // week-by-week report from loading.
        }
      }

      setWeeklyRows(rows);
      setStatus(
        `Loaded week-by-week stats for ${leagueFilter.toUpperCase()} — Season ${season} Weeks 1–${maxWeek}.`
      );
    } catch (error) {
      console.error(error);

      setStatus(
        `Failed to load stats: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }

  const gradedPickCount = stats?.counts.predictions ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Performance dashboard
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Review your prediction results.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Track winner, spread, and total performance after completed games
              are processed by the grading workflow.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:min-w-[420px]">
            <Metric label="League" value={leagueFilter.toUpperCase()} />
            <Metric label="Season" value={String(season)} />
            <Metric label="Graded" value={String(gradedPickCount)} />
          </div>
        </div>

        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-600">League</span>
              <select
                value={leagueFilter}
                onChange={(event) =>
                  setLeagueFilter(event.target.value as LeagueFilter)
                }
                className={selectClass}
              >
                <option value="nfl">NFL</option>
                <option value="ncaaf">NCAAF</option>
                <option value="both">Both</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-600">Season</span>
              <select
                value={season}
                onChange={(event) => setSeason(Number(event.target.value))}
                className={selectClass}
              >
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-600">View</span>
              <select
                value={weekMode}
                onChange={(event) => setWeekMode(event.target.value as WeekMode)}
                className={selectClass}
              >
                <option value="overall">Overall</option>
                <option value="single">Single week</option>
                <option value="by_week">Week-by-week</option>
              </select>
            </label>

            <button
              onClick={loadStats}
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
            >
              Load Stats
            </button>
          </div>

          {(weekMode === "single" || weekMode === "by_week") && (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {weekMode === "single" && (
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-600">
                    Week
                  </span>
                  <select
                    value={week}
                    onChange={(event) => setWeek(Number(event.target.value))}
                    className={selectClass}
                  >
                    <option value={1}>Week 1</option>
                    <option value={2}>Week 2</option>
                  </select>
                </label>
              )}

              {weekMode === "by_week" && (
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-600">
                    Weeks to include
                  </span>
                  <select
                    value={maxWeek}
                    onChange={(event) => setMaxWeek(Number(event.target.value))}
                    className={selectClass}
                  >
                    <option value={2}>Weeks 1–2</option>
                    <option value={4}>Weeks 1–4</option>
                    <option value={8}>Weeks 1–8</option>
                    <option value={18}>Weeks 1–18</option>
                  </select>
                </label>
              )}
            </div>
          )}

          {status && (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              {status}
            </div>
          )}
        </section>

        {stats && (weekMode === "overall" || weekMode === "single") && (
          <section className="grid gap-5">
            {stats.counts.predictions === 0 && (
              <EmptyStatsMessage />
            )}

            <StatCard title="Straight Up" block={stats.winner} />
            <StatCard title="Against the Spread" block={stats.ats} />
            <StatCard title="Total Over/Under" block={stats.total} />
          </section>
        )}

        {weekMode === "by_week" && (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            {weeklyRows.length === 0 ? (
              <div className="p-10 text-center">
                <h2 className="text-xl font-semibold text-slate-950">
                  No week-by-week rows loaded
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Load stats after games have been graded to populate this report.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-5 py-4">Week</th>
                      <th className="px-5 py-4">Graded</th>
                      <th className="px-5 py-4">Winner</th>
                      <th className="px-5 py-4">ATS</th>
                      <th className="px-5 py-4">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {weeklyRows.map((row) => (
                      <tr
                        key={row.week}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-950">
                          Week {row.week}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {row.stats.counts.predictions}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {fmtRecord(row.stats.winner)}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {fmtRecord(row.stats.ats)}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {fmtRecord(row.stats.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {!stats && weekMode !== "by_week" && (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              No stats loaded yet
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Select a league, season, and view, then load your stats.
            </p>
          </section>
        )}
      </section>
    </main>
  );
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyStatsMessage() {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
      <h2 className="font-semibold">No graded picks yet</h2>
      <p className="mt-1 text-sm leading-6">
        Your picks are saved, but stats populate after final scores are ingested
        and the backend grading workflow runs.
      </p>
    </section>
  );
}