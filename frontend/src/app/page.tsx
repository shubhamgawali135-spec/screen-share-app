"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { createSession, ApiError } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateSession() {
    setError(null);
    setIsCreating(true);
    try {
      const { session } = await createSession();
      router.push(`/present/${session.session_code}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create a session."
      );
      setIsCreating(false);
    }
  }

  function handleJoinSession(event: FormEvent) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Enter a session code to join.");
      return;
    }
    setError(null);
    router.push(`/view/${code}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-ink">Screen Share</h1>
          <p className="mt-1 text-sm text-muted">
            Share your screen with one viewer, instantly.
          </p>
        </div>

        <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Present
            </span>
            <Button
              variant="primary"
              onClick={handleCreateSession}
              disabled={isCreating}
            >
              {isCreating ? "Creating session…" : "Create Session"}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleJoinSession} className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Join
            </span>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter session code"
              className="rounded-md border border-border bg-surface-raised px-3 py-2.5 text-center font-mono text-lg tracking-code text-ink placeholder:text-sm placeholder:tracking-normal placeholder:text-muted focus:border-signal"
              maxLength={12}
            />
            <Button type="submit" variant="secondary">
              Join Session
            </Button>
          </form>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </div>
    </main>
  );
}
