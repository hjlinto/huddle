"use client";

/**
 * Login page.
 *
 * Owns the login form UI and login submission flow.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/services/api";
import { setToken } from "@/services/auth";

type LoginResponse = {
  access_token: string;
};

const inputClass =
  "h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-200";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setErr(null);

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      setErr("Username/email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: normalizedIdentifier,
          password,
        }),
      });

      setToken(response.access_token);

      router.refresh();
      router.push("/stats");
    } catch {
      setErr("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="hidden lg:block">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Prediction Pipeline
          </p>
          <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-slate-950">
            Sign in and keep your weekly picks synced.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Load matchups, make predictions, and come back later to find your
            saved picks exactly where you left them.
          </p>

          <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3">
            <FeatureCard title="Autosave" text="Picks save as you work." />
            <FeatureCard title="Multi-week" text="Track separate slates." />
            <FeatureCard title="Results" text="Stats after grading." />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Welcome back
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Login
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Continue making picks and reviewing your prediction history.
              </p>
            </div>

            <form onSubmit={onSubmit} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Username or Email
                </span>
                <input
                  placeholder="you@example.com"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Password
                </span>
                <input
                  placeholder="Your password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-12 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              {err && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {err}
                </div>
              )}
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              No account?{" "}
              <Link
                href="/register"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-lg font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}