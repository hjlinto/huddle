"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type RecordBlock = {
  wins: number;
  losses: number;
  pushes: number;
  total: number;
  win_pct: number;
};

type Stats = {
  season: number | null;
  week: number | null;
  counts: { predictions: number };
  winner: RecordBlock;
  ats: RecordBlock;
  total: RecordBlock;
};

function pct(p: number) {
  return `${Math.round(p * 100)}%`;
}

function Line({ label, r }: { label: string; r: RecordBlock }) {
  return (
    <div style={{ padding: 12, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18 }}>
        {r.wins}-{r.losses}
        {r.pushes ? `-${r.pushes}` : ""}{" "}
        <span style={{ opacity: 0.7 }}>
          ({pct(r.win_pct)}) • {r.total} graded
        </span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // MVP: hardcode season/week for now; later you can add dropdowns
  const season = 2024;
  const week = 1;

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/api/users/me/stats?season=${season}&week=${week}`);
        setStats(data);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load stats");
      }
    })();
  }, []);

  if (err) return <p style={{ color: "crimson" }}>{err}</p>;
  if (!stats) return <p>Loading stats...</p>;

  return (
    <div style={{ maxWidth: 640, margin: "24px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>My Stats</h1>
      <p style={{ opacity: 0.75, marginBottom: 16 }}>
        Season {stats.season} • Week {stats.week} • {stats.counts.predictions} graded picks
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <Line label="Winner" r={stats.winner} />
        <Line label="ATS" r={stats.ats} />
        <Line label="Totals" r={stats.total} />
      </div>
    </div>
  );
}
