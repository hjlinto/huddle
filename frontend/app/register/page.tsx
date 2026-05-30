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
          email: normalizedEmail,
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
    <div style={{ maxWidth: 420, margin: "32px auto" }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Register
      </h1>

      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        <input
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          placeholder="Password (min 8, 1 uppercase, 1 number)"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </form>

      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Already have an account?{" "}
        <Link
          href="/login"
          style={{
            color: "#2563EB",
            textDecoration: "underline",
            fontWeight: 500,
          }}
        >
          Login
        </Link>
      </p>
    </div>
  );
}