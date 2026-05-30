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
import { isValidEmail } from "@/services/validation";

type LoginResponse = {
  access_token: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setErr(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErr("Email and password are required.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErr("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch<LoginResponse>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        }
      );

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
    <div style={{ maxWidth: 420, margin: "32px auto" }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Login
      </h1>

      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        <input
          placeholder="Email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {err && (
          <p style={{ color: "crimson" }}>
            {err}
          </p>
        )}
      </form>

      <p
        style={{
          marginTop: 12,
          opacity: 0.8,
        }}
      >
        No account?{" "}
        <Link
          href="/register"
          style={{
            color: "#2563EB",
            textDecoration: "underline",
            fontWeight: 500,
          }}
        >
          Register
        </Link>
      </p>
    </div>
  );
}