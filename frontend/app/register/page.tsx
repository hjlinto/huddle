"use client";

/**
 * Registration page.
 *
 * Owns the account creation form UI and registration submission flow.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/services/api";
import { setToken } from "@/services/auth";
import { isValidEmail, validatePassword } from "@/services/validation";

type LoginResponse = {
  access_token: string;
};

const inputClass =
  "h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-200";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setErr(null);

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail || !password) {
      setErr("All fields are required.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErr("Please enter a valid email address.");
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      setErr(passwordError);
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: normalizedUsername,
          email: normalizedEmail,
          password,
        }),
      });

      const response = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: normalizedEmail,
          password,
        }),
      });

      setToken(response.access_token);

      router.refresh();
      router.push("/stats");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Registration failed");
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
            Create an account and start tracking weekly picks.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Register once, then save winner, spread, and total predictions
            across NFL and NCAAF weeks. Your picks stay tied to your account.
          </p>

          <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3">
            <FeatureCard title="NFL" text="Weekly pro football slates." />
            <FeatureCard title="NCAAF" text="College football matchups." />
            <FeatureCard title="Stats" text="Results after grading." />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                New account
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Register
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Create your account to start saving weekly predictions.
              </p>
            </div>

            <form onSubmit={onSubmit} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Username
                </span>
                <input
                  placeholder="demo_user"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Email
                </span>
                <input
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Password
                </span>
                <input
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
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
                {loading ? "Creating account..." : "Create account"}
              </button>

              {err && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {err}
                </div>
              )}
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Login
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