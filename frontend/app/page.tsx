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

const emptyPick: Pick = {
  predicted_winner: "",
  predicted_spread: "",
  predicted_total: "",
};

export default function PicksPage() {
  const [league, setLeague] = useState<League>("nfl");
  const [season, setSeason] = useState<number>(2025);
  const [week, setWeek] = useState<number>(1);

  const [games, setGames] = useState<DisplayGame[]>([]);
  const [picks, setPicks] = useState<Record<number, Pick>>({});
  const [predictionIds, setPredictionIds] = useState<Record<number, number>>({});
  const [status, setStatus] = useState<string>("");

  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
    }
  }, []);

  async function loadWeek() {
    setStatus("Loading week...");

    try {
      const response = await fetchUserWeek(league, season, week);
      const normalizedGames = normalizeWeekGames(response);
      const nextState = buildPickState(response);

      setGames(normalizedGames);
      setPicks(nextState.picks);
      setPredictionIds(nextState.predictionIds);

      setStatus(
        `Loaded ${normalizedGames.length} games. (${league.toUpperCase()} ${season} Week ${week})`
      );
    } catch (error) {
      console.error(error);
      setStatus(
        `Failed to load week: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
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
        setStatus(`Saved game ${gameId}.`);
        return;
      }

      const createdPrediction = await createPrediction(gameId, pick);

      if (createdPrediction.id) {
        setPredictionIds((previous) => ({
          ...previous,
          [gameId]: createdPrediction.id,
        }));
      }

      setStatus(`Saved game ${gameId}.`);
    } catch (error) {
      console.error(error);
      setStatus(
        `Failed to save game ${gameId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>My Weekly Picks</h1>
          <p style={{ marginTop: 8, opacity: 0.75 }}>
            Load games and make your picks. Picks autosave after a winner is selected.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            League
            <select
              value={league}
              onChange={(event) => setLeague(event.target.value as League)}
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

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Season
            <input
              type="number"
              value={season}
              onChange={(event) => setSeason(Number(event.target.value))}
              style={{ ...selectStyle, width: 90 }}
            />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Week
            <input
              type="number"
              value={week}
              onChange={(event) => setWeek(Number(event.target.value))}
              style={{ ...selectStyle, width: 70 }}
              min={1}
            />
          </label>

          <button onClick={loadWeek} style={{ padding: "8px 14px" }}>
            Load Week
          </button>
        </div>
      </div>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}

      <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
        {games.map((game) => {
          const pick = picks[game.id] ?? emptyPick;

          return (
            <section
              key={game.id}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                    {game.away_team} at {game.home_team}
                  </h2>

                  <p style={{ opacity: 0.75, marginTop: 4 }}>
                    {game.game_date ?? "Date TBD"}
                  </p>
                </div>

                <div style={{ opacity: 0.85 }}>
                  <div>Spread: {game.odds?.spread ?? "N/A"}</div>
                  <div>Total: {game.odds?.total ?? "N/A"}</div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  Winner
                  <select
                    value={pick.predicted_winner}
                    onChange={(event) =>
                      updatePick(game.id, {
                        predicted_winner: event.target.value as Pick["predicted_winner"],
                      })
                    }
                    style={selectStyle}
                  >
                    <option value="" style={optionStyle}>
                      Select winner
                    </option>
                    <option value="away" style={optionStyle}>
                      {game.away_team}
                    </option>
                    <option value="home" style={optionStyle}>
                      {game.home_team}
                    </option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  Spread
                  <select
                    value={pick.predicted_spread}
                    onChange={(event) =>
                      updatePick(game.id, {
                        predicted_spread: event.target.value as Pick["predicted_spread"],
                      })
                    }
                    style={selectStyle}
                  >
                    <option value="" style={optionStyle}>
                      Select spread pick
                    </option>
                    <option value="away" style={optionStyle}>
                      {game.away_team}
                    </option>
                    <option value="home" style={optionStyle}>
                      {game.home_team}
                    </option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  Total
                  <select
                    value={pick.predicted_total}
                    onChange={(event) =>
                      updatePick(game.id, {
                        predicted_total: event.target.value as Pick["predicted_total"],
                      })
                    }
                    style={selectStyle}
                  >
                    <option value="" style={optionStyle}>
                      Select total pick
                    </option>
                    <option value="over" style={optionStyle}>
                      Over
                    </option>
                    <option value="under" style={optionStyle}>
                      Under
                    </option>
                  </select>
                </label>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}