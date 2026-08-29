/**
 * API service.
 *
 * Owns backend request construction and response handling.
 */

import { clearToken, getToken } from "@/services/auth";

function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined.");
  }

  return apiUrl;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();

    if (response.status === 401 && isAuthExpiredMessage(message)) {
      clearToken();

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      throw new Error("Your session expired. Please sign in again.");
    }

    throw new Error(
      readErrorMessage(message) || `Request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

function readErrorMessage(message: string): string {
  try {
    const parsed = JSON.parse(message) as { message?: string; msg?: string };
    return parsed.message || parsed.msg || message;
  } catch {
    return message;
  }
}

function isAuthExpiredMessage(message: string): boolean {
  const normalizedMessage = readErrorMessage(message).toLowerCase();

  return (
    normalizedMessage.includes("token has expired") ||
    normalizedMessage.includes("missing authorization") ||
    normalizedMessage.includes("invalid token")
  );
}
