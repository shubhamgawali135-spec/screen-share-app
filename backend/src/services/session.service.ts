import { supabase } from "../config/supabase";
import { generateSessionCode } from "../utils/sessionCode";
import { Session } from "../types/session";

const TABLE = "sessions";
const UNIQUE_VIOLATION = "23505";
const MAX_CODE_ATTEMPTS = 5;

export async function createSession(): Promise<Session> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const sessionCode = generateSessionCode();

    const { data, error } = await supabase
      .from(TABLE)
      .insert({ session_code: sessionCode, status: "waiting" })
      .select()
      .single();

    if (!error) {
      return data as Session;
    }

    // Retry only on a session_code collision; anything else is a hard failure.
    if (error.code !== UNIQUE_VIOLATION) {
      throw error;
    }

    lastError = error;
  }

  throw lastError ?? new Error("Failed to generate a unique session code");
}

export async function getSessionByCode(sessionCode: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("session_code", sessionCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Session) ?? null;
}

export async function updatePresenterSocketId(
  sessionCode: string,
  presenterSocketId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ presenter_socket_id: presenterSocketId })
    .eq("session_code", sessionCode);

  if (error) {
    throw error;
  }
}

export async function endSession(sessionCode: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("session_code", sessionCode);

  if (error) {
    throw error;
  }
}
