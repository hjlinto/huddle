"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

type RecordBlock = {
  wins: number;
  losses: number;
  pushes: number;
  total: number;
  win_pct: number;
};

type StatsResponse = {
  league?: string;
  counts: { predictions: number };
  winner: RecordBlock;
  ats: RecordBlock;
  total: RecordBlock;
  season: number | null;
  week: number | null;
};

type League = "nfl" | "ncaaf";
type LeagueFilter = League | "both";
type WeekMode = "overall" | "single" | "by_week";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!API) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
}

const USERS_PREFIX = "/api/users";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function logout() {
  try {
    localStorage.removeItem("access_token");
  } catch {
  }
  window.location.href = "/login";
}

function pct(x: number) {
  if (!Number.isFinite(x)) return "0.0%";
  return `${(x * 100).toFixed(1)}%`;
}

function fmtRecord(b: RecordBlock) {
  return `${b.wins}-${b.losses}-${b.pushes} (${pct(b.win_pct)})`;
}

function combineBlocks(a: RecordBlock, b: RecordBlock): RecordBlock {
  const wins = a.wins + b.wins;
  const losses = a.losses + b.losses;
  const pushes = a.pushes + b.pushes;
  const total = a.total + b.total;
  return {
    wins,
    losses,
    pushes,
    total,
    win_pct: total ? wins / total : 0,
  };
}

function combineStats(a: StatsResponse, b: StatsResponse): StatsResponse {
  return {
    league: "both",
    counts: { predictions: a.counts.predictions + b.counts.predictions },
    winner: combineBlocks(a.winner, b.winner),
    ats: combineBlocks(a.ats, b.ats),
    total: combineBlocks(a.total, b.total),
    season: a.season ?? b.season,
    week: a.week ?? b.week,
  };
}

async function fetchStats(
  league: League,
  season: number,
  week: number | undefined
): Promise<StatsResponse> {
  const params = new URLSearchParams();
  params.set("season", String(season));
  if (week !== undefined) params.set("week", String(week));

  const url = `${API}${USERS_PREFIX}/${league}/me/stats?${params.toString()}`;
  const res = await fetch(url, { headers: authHeaders() });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return (await res.json()) as StatsResponse;
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

  const [season, setSeason] = useState<number>(2024);
  const [week, setWeek] = useState<number>(1);
  const [maxWeek, setMaxWeek] = useState<number>(18);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [weeklyRows, setWeeklyRows] = useState<
    Array<{ week: number; stats: StatsResponse }>
  >([]);

  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (!getToken()) window.location.href = "/login";
  }, []);

  async function loadStats() {
    setStatus("Loading…");
    setStats(null);
    setWeeklyRows([]);

    try {
      const leagues: League[] =
        leagueFilter === "both" ? ["nfl", "ncaaf"] : [leagueFilter];

      const loadOne = async (wk?: number) => {
        const results = await Promise.all(leagues.map((lg) => fetchStats(lg, season, wk)));
        return results.length === 2 ? combineStats(results[0], results[1]) : results[0];
      };

      if (weekMode === "overall") {
        const combined = await loadOne(undefined);
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

      const rows: Array<{ week: number; stats: StatsResponse }> = [];
      for (let wk = 1; wk <= maxWeek; wk++) {
        try {
          const combined = await loadOne(wk);
          rows.push({ week: wk, stats: combined });
        } catch {
        }
      }

      setWeeklyRows(rows);
      setStatus(
        `Loaded week-by-week stats (${leagueFilter.toUpperCase()}) — Season ${season} Weeks 1–${maxWeek}.`
      );
    } catch (e: any) {
      console.error(e);
      setStatus(`Failed: ${e?.message ?? "unknown error"}`);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>My Stats</h1>
          <p style={{ marginTop: 8, opacity: 0.75 }}>
            Filter by league and week to see performance overall or week-by-week.
          </p>
        </div>
      </div>

      {/* Controls */}
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
            onChange={(e) => setLeagueFilter(e.target.value as LeagueFilter)}
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
            onChange={(e) => setSeason(Number(e.target.value))}
            style={{ padding: 8, width: 120 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          View
          <select
            value={weekMode}
            onChange={(e) => setWeekMode(e.target.value as WeekMode)}
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
              onChange={(e) => setWeek(Number(e.target.value))}
              style={{ padding: 8, width: 100 }}
              min={1}
            />
          </label>
        )}

        {weekMode === "by_week" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Weeks (1–N)
            <input
              type="number"
              value={maxWeek}
              onChange={(e) => setMaxWeek(Number(e.target.value))}
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

      {/* Overall / Single summary cards */}
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

      {/* Week-by-week table */}
      {weekMode === "by_week" && (
        <div style={{ marginTop: 18 }}>
          {weeklyRows.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No week-by-week rows loaded.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>Week</th>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>Graded</th>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>Winner</th>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>ATS</th>
                  <th style={{ textAlign: "left", padding: "8px 6px" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {weeklyRows.map((row) => (
                  <tr
                    key={row.week}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <td style={{ padding: "10px 6px" }}>
                      <strong>{row.week}</strong>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      {row.stats.counts.predictions}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      {fmtRecord(row.stats.winner)}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      {fmtRecord(row.stats.ats)}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
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
