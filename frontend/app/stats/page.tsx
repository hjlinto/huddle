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
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <div>
          W: <strong>{block.wins}</strong>
        </div>
        <div>
          L: <strong>{block.losses}</strong>
        </div>
        <div>
          P: <strong>{block.pushes}</strong>
        </div>
        <div>
          Total: <strong>{block.total}</strong>
        </div>
        <div>
          Win%: <strong>{pct(block.win_pct)}</strong>
        </div>
      </div>
    </div>
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
    setStatus("Loading...");
    setStats(null);
    setWeeklyRows([]);

    try {
      const leagues: League[] =
        leagueFilter === "both" ? ["nfl", "ncaaf"] : [leagueFilter];

      const loadOne = async (selectedWeek?: number) => {
        const results = await Promise.all(
          leagues.map((league) =>
            fetchUserStats(league, season, selectedWeek)
          )
        );

        return results.length === 2
          ? combineStats(results[0], results[1])
          : results[0];
      };

      if (weekMode === "overall") {
        const combined = await loadOne();

        setStats(combined);
        setStatus(
          `Loaded overall stats (${leagueFilter.toUpperCase()}) — Season ${season}.`
        );

        return;
      }

      if (weekMode === "single") {
        const combined = await loadOne(week);

        setStats(combined);
        setStatus(
          `Loaded Week ${week} stats (${leagueFilter.toUpperCase()}) — Season ${season}.`
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
        `Loaded week-by-week stats (${leagueFilter.toUpperCase()}) — Season ${season} Weeks 1–${maxWeek}.`
      );
    } catch (error) {
      console.error(error);

      setStatus(
        `Failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>My Stats</h1>
        <p style={{ marginTop: 8, opacity: 0.75 }}>
          Filter by league and week to see performance overall or week-by-week.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 16,
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          League
          <select
            value={leagueFilter}
            onChange={(event) =>
              setLeagueFilter(event.target.value as LeagueFilter)
            }
            style={{ padding: 8 }}
          >
            <option value="nfl">NFL</option>
            <option value="ncaaf">NCAAF</option>
            <option value="both">Both</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Season
          <input
            type="number"
            value={season}
            onChange={(event) => setSeason(Number(event.target.value))}
            style={{ padding: 8, width: 120 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          View
          <select
            value={weekMode}
            onChange={(event) =>
              setWeekMode(event.target.value as WeekMode)
            }
            style={{ padding: 8 }}
          >
            <option value="overall">Overall (season)</option>
            <option value="single">Single week</option>
            <option value="by_week">Week-by-week</option>
          </select>
        </label>

        {weekMode === "single" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Week
            <input
              type="number"
              value={week}
              onChange={(event) => setWeek(Number(event.target.value))}
              style={{ padding: 8, width: 100 }}
              min={1}
            />
          </label>
        )}

        {weekMode === "by_week" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Weeks (1-N)
            <input
              type="number"
              value={maxWeek}
              onChange={(event) => setMaxWeek(Number(event.target.value))}
              style={{ padding: 8, width: 120 }}
              min={1}
            />
          </label>
        )}

        <button onClick={loadStats} style={{ padding: "8px 14px" }}>
          Load Stats
        </button>
      </div>

      {status && <div style={{ marginTop: 12 }}>{status}</div>}

      {stats && (weekMode === "overall" || weekMode === "single") && (
        <div style={{ marginTop: 18 }}>
          <div style={{ marginBottom: 12, opacity: 0.85 }}>
            Graded picks: <strong>{stats.counts.predictions}</strong>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <StatCard title="Winner (Straight Up)" block={stats.winner} />
            <StatCard title="ATS (Against the Spread)" block={stats.ats} />
            <StatCard title="Total (Over/Under)" block={stats.total} />
          </div>
        </div>
      )}

      {weekMode === "by_week" && (
        <div style={{ marginTop: 18 }}>
          {weeklyRows.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No week-by-week rows loaded.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>
                    Week
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>
                    Graded
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>
                    Winner
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>
                    ATS
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {weeklyRows.map((row) => (
                  <tr
                    key={row.week}
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <td style={{ padding: "8px 6px" }}>{row.week}</td>
                    <td style={{ padding: "8px 6px" }}>
                      {row.stats.counts.predictions}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {fmtRecord(row.stats.winner)}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {fmtRecord(row.stats.ats)}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {fmtRecord(row.stats.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}