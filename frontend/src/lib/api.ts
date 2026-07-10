import { Session } from "@/types/session";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  // Fails loudly in dev rather than silently hitting a relative URL.
  console.warn(
    "NEXT_PUBLIC_BACKEND_URL is not set. Copy .env.local.example to .env.local."
  );
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL ?? ""}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export function createSession(): Promise<{ session: Session }> {
  return request<{ session: Session }>("/api/sessions", {
    method: "POST",
  });
}

export function getSession(sessionCode: string): Promise<{ session: Session }> {
  return request<{ session: Session }>(
    `/api/sessions/${encodeURIComponent(sessionCode)}`
  );
}
