"use client";

import { useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/auth";

type Odds = { spread: number | null; total: number | null };

type Game = {
  id: number;
  season: number;
  week: number;
  game_date?: string;
  home_team: string;
  away_team: string;
  odds?: Odds | null;
};

type Pick = {
  predicted_winner: "" | "home" | "away";
  predicted_spread: "" | "home" | "away";
  predicted_total: "" | "over" | "under";
};

type League = "nfl" | "ncaaf";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000";

const selectStyle: React.CSSProperties = {
  padding: 8,
  color: "#000",
  backgroundColor: "#fff",
  border: "1px solid #ccc",
  borderRadius: 4,
};

const optionStyle: React.CSSProperties = {
  color: "#000",
  backgroundColor: "#fff",
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

function logout() {
  try {
    localStorage.removeItem("access_token");
  } catch {
    // ignore
  }
  window.location.href = "/login";
}

export default function PicksPage() {
  const [league, setLeague] = useState<League>("nfl");
  const [season, setSeason] = useState<number>(2024);
  const [week, setWeek] = useState<number>(1);

  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<number, Pick>>({});
  const [predictionIds, setPredictionIds] = useState<Record<number, number>>({});

  const [status, setStatus] = useState<string>("");

  const saveTimers = useRef<Record<number, any>>({});

  /* -------------------- AUTH GUARD -------------------- */
  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
    }
  }, []);

  /* -------------------- LOAD WEEK -------------------- */
  async function loadWeek() {
    setStatus("Loading week…");

    try {
      const res = await fetch(`${API}/api/weeks/${league}/${season}/${week}/me`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        const text = await res.text();
        setStatus(`Failed to load week (HTTP ${res.status}): ${text}`);
        return;
      }

      const data = await res.json();

      // backend returns { league, season, week, games: [...] }
      const rows = Array.isArray(data) ? data : data?.games ?? [];

      const normalized: Game[] = rows.map((row: any) => ({
        ...row.game,
        odds: row.odds ?? null,
      }));

      setGames(normalized);

      const nextPicks: Record<number, Pick> = {};
      const nextIds: Record<number, number> = {};

      for (const row of rows) {
        const g = row.game;
        const p = row.my_prediction;

        nextPicks[g.id] = p
          ? {
              predicted_winner: p.predicted_winner ?? "",
              predicted_spread: p.predicted_spread ?? "",
              predicted_total: p.predicted_total ?? "",
            }
          : { predicted_winner: "", predicted_spread: "", predicted_total: "" };

        if (p?.id) nextIds[g.id] = p.id;
      }

      setPicks(nextPicks);
      setPredictionIds(nextIds);

      setStatus(
        `Loaded ${normalized.length} games. (${league.toUpperCase()} ${season} Week ${week})`
      );
    } catch (e: any) {
      console.error(e);
      setStatus(`Failed to load week: ${e?.message ?? "unknown error"}`);
    }
  }

  /* -------------------- AUTOSAVE -------------------- */
  function updatePick(gameId: number, patch: Partial<Pick>) {
    setPicks((prev) => {
      const nextPick = { ...prev[gameId], ...patch } as Pick;
      scheduleAutosave(gameId, nextPick);
      return { ...prev, [gameId]: nextPick };
    });
  }

  function scheduleAutosave(gameId: number, pick: Pick) {
    // keep your behavior: only autosave once winner is selected
    if (pick.predicted_winner === "") return;

    if (saveTimers.current[gameId]) {
      clearTimeout(saveTimers.current[gameId]);
    }

    saveTimers.current[gameId] = setTimeout(() => {
      void autosave(gameId, pick);
    }, 400);
  }

  async function autosave(gameId: number, pick: Pick) {
    const existingId = predictionIds[gameId];

    if (existingId) {
      try {
        const res = await fetch(`${API}/api/predictions/${existingId}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            predicted_winner: pick.predicted_winner,
            predicted_spread: pick.predicted_spread || null,
            predicted_total: pick.predicted_total || null,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          setStatus(`Failed to save game ${gameId} (HTTP ${res.status}): ${text}`);
          return;
        }

        setStatus(`Saved game ${gameId}.`);
      } catch (e) {
        console.error(e);
        setStatus(`Failed to save game ${gameId}.`);
      }
      return;
    }

    try {
      const res = await fetch(`${API}/api/predictions/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          game_id: gameId,
          predicted_winner: pick.predicted_winner,
          predicted_spread: pick.predicted_spread || null,
          predicted_total: pick.predicted_total || null,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        setStatus(`Failed to create pick (HTTP ${res.status}): ${text}`);
        return;
      }

      const created = JSON.parse(text);
      if (created?.id) {
        setPredictionIds((prev) => ({ ...prev, [gameId]: created.id }));
      }

      setStatus(`Saved game ${gameId}.`);
    } catch (e) {
      console.error(e);
      setStatus(`Failed to create pick for game ${gameId}.`);
    }
  }

  /* -------------------- UI -------------------- */
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header / Nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>My Weekly Picks</h1>
          <p style={{ marginTop: 8, opacity: 0.75 }}>
            Load games and make your picks (auto-saved).
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            League
            <select
              value={league}
              onChange={(e) => setLeague(e.target.value as League)}
              style={selectStyle}
            >
              <option value="nfl" style={optionStyle}>
                NFL
              </option>
              <option value="ncaaf" style={optionStyle}>
                NCAAF
              </option>
            </select>
          </label>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <label>
          Season{" "}
          <input
            type="number"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            style={{ padding: 8, width: 110 }}
          />
        </label>

        <label>
          Week{" "}
          <input
            type="number"
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            style={{ padding: 8, width: 90 }}
          />
        </label>

        <button onClick={loadWeek}>Load Week</button>
      </div>

      {/* Spread reminder */}
      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
        <strong>Spread tip:</strong> Negative spread (e.g., <strong>-3</strong>) means the{" "}
        <strong>home team is favored by 3</strong>. Positive spread means the home team is the underdog.
      </div>

      {status && <div style={{ marginTop: 12 }}>{status}</div>}

      {/* Table */}
      <div style={{ marginTop: 18 }}>
        {games.length === 0 ? (
          <div>No games loaded.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Matchup</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Odds</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Winner</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>ATS</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const p = picks[g.id];

                return (
                  <tr key={g.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={{ padding: "10px 6px" }}>
                      {g.away_team} @ {g.home_team}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      Spread: {g.odds?.spread ?? "—"} <br />
                      Total: {g.odds?.total ?? "—"}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <select
                        value={p?.predicted_winner ?? ""}
                        onChange={(e) =>
                          updatePick(g.id, {
                            predicted_winner: e.target.value as Pick["predicted_winner"],
                          })
                        }
                        style={selectStyle}
                      >
                        <option value="" style={optionStyle}>
                          —
                        </option>
                        <option value="away" style={optionStyle}>
                          Away
                        </option>
                        <option value="home" style={optionStyle}>
                          Home
                        </option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <select
                        value={p?.predicted_spread ?? ""}
                        onChange={(e) =>
                          updatePick(g.id, {
                            predicted_spread: e.target.value as Pick["predicted_spread"],
                          })
                        }
                        style={selectStyle}
                      >
                        <option value="" style={optionStyle}>
                          —
                        </option>
                        <option value="away" style={optionStyle}>
                          Away
                        </option>
                        <option value="home" style={optionStyle}>
                          Home
                        </option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <select
                        value={p?.predicted_total ?? ""}
                        onChange={(e) =>
                          updatePick(g.id, {
                            predicted_total: e.target.value as Pick["predicted_total"],
                          })
                        }
                        style={selectStyle}
                      >
                        <option value="" style={optionStyle}>
                          —
                        </option>
                        <option value="over" style={optionStyle}>
                          Over
                        </option>
                        <option value="under" style={optionStyle}>
                          Under
                        </option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
