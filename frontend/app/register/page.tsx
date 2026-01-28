"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";
import Link from "next/link";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Rules: >= 8 chars, at least 1 uppercase, at least 1 number
function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/\d/.test(pw)) return "Password must contain at least one number.";
  return null;
}

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const u = username.trim();
    const eNorm = email.trim().toLowerCase();
    const pw = password;

    if (!u || !eNorm || !pw) {
      setErr("All fields are required.");
      return;
    }

    if (!isValidEmail(eNorm)) {
      setErr("Please enter a valid email address.");
      return;
    }

    const pwErr = validatePassword(pw);
    if (pwErr) {
      setErr(pwErr);
      return;
    }

    setLoading(true);

    try {
      // 1) Register
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username: u, email: eNorm, password: pw }),
      });

      // 2) Login right away to get token
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: eNorm, password: pw }),
      });

      setToken(data.access_token);
      router.refresh();
      router.push("/stats");
    } catch (e: any) {
      setErr(e?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "32px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Register</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password (min 8, 1 uppercase, 1 number)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
