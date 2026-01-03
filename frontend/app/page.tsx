"use client";

import { useEffect, useRef, useState } from "react";

type User = { id: number; username: string };
type Odds = { spread: number | null; total: number | null };

// This is the FLATTENED game shape we render after normalizing /api/weeks output
type Game = {
  id: number;
  season: number;
  week: number;
  game_date?: string;
  home_team: string;
  away_team: string;
  home_score?: number | null;
  away_score?: number | null;
  is_final?: boolean;
  odds?: Odds | null;
};

type Pick = {
  predicted_winner: "" | "home" | "away";
  predicted_spread: "" | "home" | "away";
  predicted_total: "" | "over" | "under";
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000";

// Consistent, readable dropdown styling everywhere
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

export default function Home() {
  const [season, setSeason] = useState<number>(2024);
  const [week, setWeek] = useState<number>(1);

  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<number | "">("");

  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Record<number, Pick>>({});

  // store prediction id returned by backend for each game (so we can PUT updates)
  const [predictionIds, setPredictionIds] = useState<Record<number, number>>({});

  const [status, setStatus] = useState<string>("");

  // debounce timers per game to avoid spamming requests
  const saveTimers = useRef<Record<number, any>>({});

  /* -------------------- USERS -------------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/users/`);
        const data = await res.json();
        setUsers(data);

        const saved = localStorage.getItem("user_id");
        if (saved) setUserId(Number(saved));
      } catch {
        setStatus("Failed to load users. Is Flask running?");
      }
    })();
  }, []);

  useEffect(() => {
    if (userId !== "") localStorage.setItem("user_id", String(userId));
  }, [userId]);

  /* -------------------- LOAD WEEK -------------------- */
  async function loadWeek() {
    setStatus("Loading week…");
    try {
      const res = await fetch(`${API}/api/weeks/${season}/${week}`);
      if (!res.ok) {
        setStatus(`Failed to load week (HTTP ${res.status}).`);
        return;
      }

      // Backend returns [{ game: {...}, odds: {...}, predictions: [...] }, ...]
      const data = await res.json();

      const normalized: Game[] = (Array.isArray(data) ? data : []).map((row: any) => ({
        ...row.game,
        odds: row.odds ?? null,
      }));

      setGames(normalized);

      // initialize empty picks if missing
      setPicks((prev) => {
        const next = { ...prev };
        for (const g of normalized) {
          if (!next[g.id]) {
            next[g.id] = { predicted_winner: "", predicted_spread: "", predicted_total: "" };
          }
        }
        return next;
      });

      setStatus(`Loaded ${normalized.length} games.`);
    } catch (e) {
      console.error(e);
      setStatus("Failed to load week (exception).");
    }
  }

  /* -------------------- AUTO SAVE (POST then PUT) -------------------- */
  function updatePick(gameId: number, patch: Partial<Pick>) {
    setPicks((prev) => {
      const nextPick: Pick = { ...prev[gameId], ...patch } as Pick;
      const next = { ...prev, [gameId]: nextPick };

      // schedule autosave for this game
      scheduleAutosave(gameId, nextPick);

      return next;
    });
  }

  function scheduleAutosave(gameId: number, pick: Pick) {
    if (userId === "") {
      setStatus("Select a user to save picks.");
      return;
    }

    // don’t save until winner is selected (you can change this if you want)
    if (pick.predicted_winner === "") return;

    if (saveTimers.current[gameId]) clearTimeout(saveTimers.current[gameId]);

    saveTimers.current[gameId] = setTimeout(() => {
      void autosave(gameId, pick);
    }, 400);
  }

  async function autosave(gameId: number, pick: Pick) {
    if (userId === "") return;

    const existingId = predictionIds[gameId];

    // If we already created a prediction for this game, update it via PUT
    if (existingId) {
      setStatus(`Saving (update) game ${gameId}…`);
      try {
        const res = await fetch(`${API}/api/predictions/${existingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            predicted_winner: pick.predicted_winner,
            predicted_spread: pick.predicted_spread || null,
            predicted_total: pick.predicted_total || null,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }

        setStatus(`Saved (updated) game ${gameId}.`);
        return;
      } catch (e) {
        console.error(e);
        setStatus(`Failed to update game ${gameId}. Check Flask logs.`);
        return;
      }
    }

    // Otherwise create it via POST
    setStatus(`Saving (create) game ${gameId}…`);
    try {
      const res = await fetch(`${API}/api/predictions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          game_id: gameId,
          predicted_winner: pick.predicted_winner,
          predicted_spread: pick.predicted_spread || null,
          predicted_total: pick.predicted_total || null,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text);

      const created = JSON.parse(text);
      if (created?.id) {
        setPredictionIds((prev) => ({ ...prev, [gameId]: created.id }));
      }

      setStatus(`Saved (created) game ${gameId}.`);
    } catch (e) {
      console.error(e);
      setStatus(`Failed to create game ${gameId}. (Need PUT endpoint if unique constraint hit)`);
    }
  }

  /* -------------------- UI -------------------- */
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>NFL Weekly Picks</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>
        Load games + odds, select user, make picks (auto-saved).
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
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

        <button onClick={loadWeek} style={{ padding: "8px 12px" }}>
          Load Week
        </button>

        <label style={{ marginLeft: 12 }}>
          User{" "}
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : "")}
            style={{ ...selectStyle, minWidth: 220 }}
          >
            <option value="" style={optionStyle}>
              Select user…
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id} style={optionStyle}>
                {u.username} (id {u.id})
              </option>
            ))}
          </select>
        </label>
      </div>

      {status && <div style={{ marginTop: 12, padding: 10, background: "#f4f4f5" }}>{status}</div>}

      <div style={{ marginTop: 18 }}>
        {games.length === 0 ? (
          <div style={{ padding: 12, border: "1px solid #ddd" }}>
            No games loaded yet. Click <b>Load Week</b>.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 10 }}>Matchup</th>
                <th style={{ padding: 10 }}>Odds</th>
                <th style={{ padding: 10 }}>Winner</th>
                <th style={{ padding: 10 }}>ATS</th>
                <th style={{ padding: 10 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const p = picks[g.id] ?? { predicted_winner: "", predicted_spread: "", predicted_total: "" };

                return (
                  <tr key={g.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 10 }}>
                      <div style={{ fontWeight: 600 }}>
                        {g.away_team} @ {g.home_team}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>game_id: {g.id}</div>
                    </td>

                    <td style={{ padding: 10 }}>
                      <div>Spread: {g.odds?.spread ?? "—"}</div>
                      <div>Total: {g.odds?.total ?? "—"}</div>
                    </td>

                    <td style={{ padding: 10 }}>
                      <select
                        value={p.predicted_winner}
                        onChange={(e) => updatePick(g.id, { predicted_winner: e.target.value as Pick["predicted_winner"] })}
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

                    <td style={{ padding: 10 }}>
                      <select
                        value={p.predicted_spread}
                        onChange={(e) => updatePick(g.id, { predicted_spread: e.target.value as Pick["predicted_spread"] })}
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

                    <td style={{ padding: 10 }}>
                      <select
                        value={p.predicted_total}
                        onChange={(e) => updatePick(g.id, { predicted_total: e.target.value as Pick["predicted_total"] })}
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
