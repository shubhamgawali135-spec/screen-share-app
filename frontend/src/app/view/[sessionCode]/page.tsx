"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import StatusPill from "@/components/StatusPill";
import PlaceholderPanel from "@/components/PlaceholderPanel";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { rtcConfig } from "@/lib/webrtc";
import type {
  JoinSessionAck,
  WebrtcOfferPayload,
  WebrtcIceCandidatePayload,
} from "@/types/socket";

type ConnectionStatus =
  | "joining"
  | "waiting-for-presenter"
  | "reconnecting"
  | "restored"
  | "error";
type ShareState = "idle" | "connecting" | "live" | "stopped" | "ended";

const connectionCopy: Record<
  ConnectionStatus,
  { label: string; tone: "idle" | "warn" | "danger" | "live" }
> = {
  joining: { label: "Joining session…", tone: "idle" },
  "waiting-for-presenter": { label: "Waiting for presenter", tone: "warn" },
  reconnecting: { label: "Reconnecting…", tone: "warn" },
  restored: { label: "Connection restored", tone: "live" },
  error: { label: "Connection error", tone: "danger" },
};

const RESTORED_DISPLAY_MS = 1500;

export default function ViewPage({
  params,
}: {
  params: { sessionCode: string };
}) {
  const { sessionCode } = params;
  const router = useRouter();
  const mainRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("joining");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [shareState, setShareState] = useState<ShareState>("idle");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  function teardownPeerConnection() {
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    const socket = getSocket();
    let hasConnectedBefore = false;
    let restoreTimeout: ReturnType<typeof setTimeout> | undefined;

    setConnectionStatus("joining");
    setErrorMessage(null);

    function joinSession(isReconnect: boolean) {
      // Any peer connection we were holding is tied to the dropped
      // connection — always start clean before (re)joining rather than
      // trying to reuse it.
      teardownPeerConnection();

      socket.emit(
        "receiver:join-session",
        { sessionCode },
        (response: JoinSessionAck) => {
          if (!response.ok) {
            if (response.code === "session_ended") {
              setShareState("ended");
            } else {
              setErrorMessage(response.error ?? "Failed to join session");
            }
            setConnectionStatus("error");
            return;
          }

          setErrorMessage(null);
          const isSharing = response.session?.isSharing ?? false;

          if (isSharing) {
            // Presenter is already sharing — a fresh offer will follow once
            // it notices this (re)join, so show a transitional state rather
            // than "waiting."
            setShareState("connecting");
          } else if (isReconnect) {
            setShareState("stopped");
          } else {
            setShareState("idle");
          }

          if (isReconnect) {
            setConnectionStatus("restored");
            clearTimeout(restoreTimeout);
            restoreTimeout = setTimeout(() => {
              setConnectionStatus("waiting-for-presenter");
            }, RESTORED_DISPLAY_MS);
          } else {
            setConnectionStatus("waiting-for-presenter");
          }
        }
      );
    }

    function handleConnect() {
      const isReconnect = hasConnectedBefore;
      hasConnectedBefore = true;
      joinSession(isReconnect);
    }

    function handleDisconnect(reason: string) {
      // "io client disconnect" means we called socket.disconnect() ourselves
      // (Leave Session, unmount) — not a dropped connection.
      if (reason === "io client disconnect") return;

      teardownPeerConnection();
      setShareState((prev) => (prev === "live" ? "connecting" : prev));
      setConnectionStatus("reconnecting");
    }

    function handleSessionError(payload: { message: string }) {
      setErrorMessage(payload.message);
      setConnectionStatus("error");
    }

    function handleConnectError() {
      if (!hasConnectedBefore) {
        setErrorMessage("Could not connect to the server.");
        setConnectionStatus("error");
      } else {
        setConnectionStatus("reconnecting");
      }
    }

    function handleSharingStarted() {
      setShareState("connecting");
    }

    async function handleOffer(payload: WebrtcOfferPayload) {
      teardownPeerConnection();

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        }
        setShareState("live");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc:ice-candidate", {
            sessionCode,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      await pc.setRemoteDescription(payload.offer);

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { sessionCode, answer });
    }

    async function handleRemoteIceCandidate(payload: WebrtcIceCandidatePayload) {
      const pc = pcRef.current;
      if (!pc) return;

      if (pc.remoteDescription) {
        await pc.addIceCandidate(payload.candidate);
      } else {
        pendingCandidatesRef.current.push(payload.candidate);
      }
    }

    function handleSharingStopped() {
      teardownPeerConnection();
      setShareState("stopped");
    }

    function handleSessionEnded() {
      teardownPeerConnection();
      setShareState("ended");
      disconnectSocket();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("session:error", handleSessionError);
    socket.on("connect_error", handleConnectError);
    socket.on("session:sharing-started", handleSharingStarted);
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:ice-candidate", handleRemoteIceCandidate);
    socket.on("session:sharing-stopped", handleSharingStopped);
    socket.on("session:ended", handleSessionEnded);

    socket.connect();

    return () => {
      clearTimeout(restoreTimeout);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("session:error", handleSessionError);
      socket.off("connect_error", handleConnectError);
      socket.off("session:sharing-started", handleSharingStarted);
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:ice-candidate", handleRemoteIceCandidate);
      socket.off("session:sharing-stopped", handleSharingStopped);
      socket.off("session:ended", handleSessionEnded);
      teardownPeerConnection();
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode]);

  function handleLeave() {
    router.push("/");
  }

  function handleReconnect() {
    // Manual nudge for cases where the automatic reconnect is taking a
    // while — forces the socket to reconnect (and rejoin) right now rather
    // than waiting on its backoff timer. Not meaningful once ended.
    if (shareState === "ended") return;

    setIsReconnecting(true);
    const socket = getSocket();
    socket.disconnect();
    socket.connect();
    setTimeout(() => setIsReconnecting(false), 800);
  }

  function handleFullScreen() {
    const target: Element | null = showVideo ? videoRef.current : mainRef.current;
    target?.requestFullscreen?.();
  }

  const showVideo = shareState === "live";
  const topStatus =
    shareState === "ended"
      ? { label: "Session ended", tone: "danger" as const }
      : connectionCopy[connectionStatus];

  return (
    <main
      ref={mainRef}
      className="flex min-h-screen flex-col items-center bg-base px-6 py-12"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="font-mono text-sm tracking-code text-muted">
            {sessionCode}
          </span>
          <StatusPill label={topStatus.label} tone={topStatus.tone} />
        </div>

        <div className="w-full overflow-hidden rounded-lg bg-surface">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`aspect-video w-full object-contain ${showVideo ? "block" : "hidden"}`}
          />
          {!showVideo && (
            <PlaceholderPanel
              label={
                shareState === "ended"
                  ? "Session ended"
                  : connectionStatus === "reconnecting"
                  ? "Reconnecting…"
                  : connectionStatus === "error"
                  ? "Unable to join session"
                  : shareState === "stopped"
                  ? "Sharing stopped"
                  : shareState === "connecting"
                  ? "Connecting to presenter…"
                  : "Waiting for presenter"
              }
              hint={
                shareState === "ended"
                  ? "The presenter has ended this session."
                  : connectionStatus === "reconnecting"
                  ? "Connection dropped — attempting to reconnect…"
                  : connectionStatus === "error"
                  ? errorMessage ?? "This session code may be invalid or ended."
                  : shareState === "stopped"
                  ? "The presenter stopped sharing their screen."
                  : "The shared screen will appear here once the presenter starts sharing."
              }
            />
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button variant="secondary" onClick={handleLeave}>
            Leave Session
          </Button>
          <Button
            variant="secondary"
            onClick={handleReconnect}
            disabled={isReconnecting || shareState === "ended"}
          >
            {isReconnecting ? "Reconnecting…" : "Reconnect"}
          </Button>
          <Button variant="secondary" onClick={handleFullScreen}>
            Full Screen
          </Button>
        </div>
      </div>
    </main>
  );
}
