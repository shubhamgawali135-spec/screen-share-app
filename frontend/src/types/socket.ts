import { SessionStatus } from "./session";

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
    receiverConnected: boolean;
    isSharing: boolean;
  };
}

export interface WebrtcOfferPayload {
  sessionCode: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebrtcAnswerPayload {
  sessionCode: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebrtcIceCandidatePayload {
  sessionCode: string;
  candidate: RTCIceCandidateInit;
}

export interface SessionCodePayload {
  sessionCode: string;
}

export interface ClientToServerEvents {
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
  "session:receiver-joined": (payload: { sessionCode: string }) => void;
  "session:error": (payload: { message: string }) => void;
  "webrtc:offer": (payload: WebrtcOfferPayload) => void;
  "webrtc:answer": (payload: WebrtcAnswerPayload) => void;
  "webrtc:ice-candidate": (payload: WebrtcIceCandidatePayload) => void;
  "session:sharing-started": (payload: { sessionCode: string }) => void;
  "session:sharing-stopped": (payload: { sessionCode: string }) => void;
  "session:ended": (payload: { sessionCode: string }) => void;
}
