"use client";

/**
 * Header navigation component.
 *
 * Displays primary application navigation and authentication actions.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { clearToken, getToken } from "@/services/auth";

export default function HeaderNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loggedIn = mounted && Boolean(getToken());

  function logout(): void {
    clearToken();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-bold text-slate-950">
          NFL Prediction Pipeline
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {loggedIn ? (
            <>
              <Link
                href="/"
                className={
                  pathname === "/"
                    ? "font-semibold text-slate-950"
                    : "text-slate-600 hover:text-slate-950"
                }
              >
                Picks
              </Link>

              <Link
                href="/stats"
                className={
                  pathname === "/stats"
                    ? "font-semibold text-slate-950"
                    : "text-slate-600 hover:text-slate-950"
                }
              >
                Stats
              </Link>

              <button
                onClick={logout}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          ) : pathname === "/login" ? (
            <Link
              href="/register"
              className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
            >
              Register
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}