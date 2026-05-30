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
    <header
      style={{
        borderBottom: "1px solid rgba(0,0,0,0.1)",
        padding: "12px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            marginRight: 12,
          }}
        >
          NFL Picks
        </Link>

        <nav
          style={{
            display: "flex",
            gap: 12,
          }}
        >
          {loggedIn ? (
            <>
              <Link href="/stats">Stats</Link>

              <button
                onClick={logout}
                style={{ cursor: "pointer" }}
              >
                Logout
              </button>
            </>
          ) : pathname === "/login" ? (
            <Link href="/register">Register</Link>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}