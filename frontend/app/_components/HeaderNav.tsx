"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearToken, getToken } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";

export default function HeaderNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getToken());
  }, [pathname]);

  function logout() {
    clearToken();
    setLoggedIn(false);
    router.push("/login");
  }

  return (
    <header
      style={{
        borderBottom: "1px solid rgba(0,0,0,0.1)",
        padding: "12px 24px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/" style={{ fontWeight: 700, marginRight: 12 }}>
          NFL Picks
        </Link>

        <nav style={{ display: "flex", gap: 12 }}>
          {loggedIn ? (
            <>
              <Link href="/stats">Stats</Link>
              <button onClick={logout} style={{ cursor: "pointer" }}>Logout</button>
            </>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
