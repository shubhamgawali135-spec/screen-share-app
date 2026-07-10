export type SessionStatus = "waiting" | "active" | "ended";

export interface Session {
  id: string;
  session_code: string;
  status: SessionStatus;
  presenter_socket_id: string | null;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}
