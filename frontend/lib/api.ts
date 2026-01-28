import { getToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();

  const headers = new Headers(init.headers || {});
  // only set JSON content-type when we actually send a body
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && data.message) ||
      (data && data.error) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
