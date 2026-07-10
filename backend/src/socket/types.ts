// Extend these further as needed. Signaling payloads are passed through
// largely opaque (RTCSessionDescriptionInit / RTCIceCandidateInit) since the
// server only relays them between the two peers in a session — it doesn't
// need to understand their contents.

import { SessionStatus } from "../types/session";

export type SessionRole = "presenter" | "receiver";

export interface JoinSessionPayload {
  sessionCode: string;
}

export type JoinSessionErrorCode = "invalid_session" | "session_ended" | "role_taken";

export interface JoinSessionAck {
  ok: boolean;
  error?: string;
  code?: JoinSessionErrorCode;
  session?: {
    sessionCode: string;
    status: SessionStatus;
    // Room state at the moment of (re)join, so a reconnecting client can
    // restore the right UI immediately instead of waiting for a follow-up
    // event that may never come (e.g. the other side never re-joins).
    receiverConnected: boolean;
    isSharing: boolean;
  };
}

export interface WebrtcOfferPayload {
  sessionCode: string;
  offer: unknown; // RTCSessionDescriptionInit, kept opaque on the server
}

export interface WebrtcAnswerPayload {
  sessionCode: string;
  answer: unknown; // RTCSessionDescriptionInit, kept opaque on the server
}

export interface WebrtcIceCandidatePayload {
  sessionCode: string;
  candidate: unknown; // RTCIceCandidateInit, kept opaque on the server
}

export interface SessionCodePayload {
  sessionCode: string;
}

export interface ClientToServerEvents {
  ping: () => void;
  "presenter:join-session": (
    payload: JoinSessionPayload,
    ack?: (response: JoinSessionAck) => void
  ) => void;
  "receiver:join-session": (
    payload: JoinSessionPayload,
    ack?: (response: JoinSessionAck) => void
  ) => void;
  "webrtc:offer": (payload: WebrtcOfferPayload) => void;
  "webrtc:answer": (payload: WebrtcAnswerPayload) => void;
  "webrtc:ice-candidate": (payload: WebrtcIceCandidatePayload) => void;
  "presenter:start-sharing": (payload: SessionCodePayload) => void;
  "presenter:stop-sharing": (payload: SessionCodePayload) => void;
  "presenter:end-session": (payload: SessionCodePayload) => void;
}

export interface ServerToClientEvents {
  pong: () => void;
  "session:receiver-joined": (payload: { sessionCode: string }) => void;
  "session:error": (payload: { message: string }) => void;
  "webrtc:offer": (payload: WebrtcOfferPayload) => void;
  "webrtc:answer": (payload: WebrtcAnswerPayload) => void;
  "webrtc:ice-candidate": (payload: WebrtcIceCandidatePayload) => void;
  "session:sharing-started": (payload: { sessionCode: string }) => void;
  "session:sharing-stopped": (payload: { sessionCode: string }) => void;
  "session:ended": (payload: { sessionCode: string }) => void;
}

export interface InterServerEvents {
  // Reserved for future multi-instance coordination, if ever needed.
}

export interface SocketData {
  sessionCode?: string;
  role?: SessionRole;
}
