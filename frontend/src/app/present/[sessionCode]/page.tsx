"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import StatusPill from "@/components/StatusPill";
import PlaceholderPanel from "@/components/PlaceholderPanel";
import SessionCodeDisplay from "@/components/SessionCodeDisplay";
import QrCode from "@/components/QrCode";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { rtcConfig } from "@/lib/webrtc";
import type {
  JoinSessionAck,
  WebrtcAnswerPayload,
  WebrtcIceCandidatePayload,
} from "@/types/socket";

type ConnectionStatus =
  | "joining"
  | "waiting-for-receiver"
  | "receiver-connected"
  | "reconnecting"
  | "restored"
  | "error";

type ShareStatus = "idle" | "starting" | "sharing" | "ended";

const connectionCopy: Record<
  ConnectionStatus,
  { label: string; tone: "idle" | "live" | "warn" | "danger" }
> = {
  joining: { label: "Joining session…", tone: "idle" },
  "waiting-for-receiver": { label: "Waiting for receiver", tone: "warn" },
  "receiver-connected": { label: "Receiver connected", tone: "live" },
  reconnecting: { label: "Reconnecting…", tone: "warn" },
  restored: { label: "Connection restored", tone: "live" },
  error: { label: "Connection error", tone: "danger" },
};

const RESTORED_DISPLAY_MS = 1500;

export default function PresenterPage({
  params,
}: {
  params: { sessionCode: string };
}) {
  const { sessionCode } = params;

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("joining");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  // window isn't available during SSR, so the join URL is filled in after
  // mount rather than computed at render time.
  useEffect(() => {
    setJoinUrl(`${window.location.origin}/view/${sessionCode}`);
  }, [sessionCode]);

  // WebRTC state lives in refs, not React state — it's mutable machinery,
  // not something that should trigger re-renders on its own.
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // A "latest value" ref for shareStatus so socket handlers registered once
  // (inside the mount effect below) can read the current value instead of a
  // stale one captured at effect-setup time.
  const shareStatusRef = useRef<ShareStatus>("idle");
  useEffect(() => {
    shareStatusRef.current = shareStatus;
  }, [shareStatus]);

  function teardownPeerConnection() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    pendingCandidatesRef.current = [];
  }

  // Closes any existing peer connection (without touching local media
  // tracks — the capture may still be valid) and builds a fresh one, then
  // sends a fresh offer. Used both for the initial Start Sharing click and
  // to recover when a receiver rejoins mid-share with a broken connection.
  async function startPeerConnectionAndOffer(sessionCodeForOffer: string) {
    const stream = streamRef.current;
    if (!stream) return;

    pcRef.current?.close();
    pendingCandidatesRef.current = [];

    const socket = getSocket();
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice-candidate", {
          sessionCode: sessionCodeForOffer,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("webrtc:offer", { sessionCode: sessionCodeForOffer, offer });
  }

  // Session join + signaling listeners — set up once per session code.
  useEffect(() => {
    const socket = getSocket();
    let hasConnectedBefore = false;
    let restoreTimeout: ReturnType<typeof setTimeout> | undefined;

    setConnectionStatus("joining");
    setErrorMessage(null);

    function joinSession(isReconnect: boolean) {
      socket.emit(
        "presenter:join-session",
        { sessionCode },
        (response: JoinSessionAck) => {
          if (!response.ok) {
            setErrorMessage(response.error ?? "Failed to join session");
            setConnectionStatus("error");
            return;
          }

          const receiverConnected = response.session?.receiverConnected ?? false;
          setErrorMessage(null);

          if (isReconnect) {
            setConnectionStatus("restored");
            clearTimeout(restoreTimeout);
            restoreTimeout = setTimeout(() => {
              setConnectionStatus(
                receiverConnected ? "receiver-connected" : "waiting-for-receiver"
              );
            }, RESTORED_DISPLAY_MS);
          } else {
            setConnectionStatus(
              receiverConnected ? "receiver-connected" : "waiting-for-receiver"
            );
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
      // (Stop/End Session, unmount) — not a dropped connection, so no
      // reconnecting UI is needed. Socket.IO's own auto-reconnect handles
      // everything else; we just reflect it in the UI here.
      if (reason === "io client disconnect") return;
      setConnectionStatus("reconnecting");
    }

    function handleReceiverJoined() {
      setConnectionStatus("receiver-connected");

      const track = streamRef.current?.getVideoTracks()[0];
      if (shareStatusRef.current === "sharing" && track?.readyState === "live") {
        // The receiver just (re)joined while we're already sharing — their
        // old peer connection (if any) is gone, so build a fresh one rather
        // than trying to reuse whatever this presenter's pc was doing.
        startPeerConnectionAndOffer(sessionCode).catch((err) => {
          console.error("[presenter] failed to rebuild peer connection:", err);
        });
      }
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

    async function handleAnswer(payload: WebrtcAnswerPayload) {
      const pc = pcRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(payload.answer);

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current = [];
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

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("session:receiver-joined", handleReceiverJoined);
    socket.on("session:error", handleSessionError);
    socket.on("connect_error", handleConnectError);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleRemoteIceCandidate);

    socket.connect();

    return () => {
      clearTimeout(restoreTimeout);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("session:receiver-joined", handleReceiverJoined);
      socket.off("session:error", handleSessionError);
      socket.off("connect_error", handleConnectError);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleRemoteIceCandidate);
      teardownPeerConnection();
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode]);

  async function startSharing() {
    setErrorMessage(null);
    setShareStatus("starting");

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;

      // Browser-native "Stop sharing" control (in the OS/browser picker bar)
      // fires this on the track directly — treat it the same as our own
      // Stop Sharing button.
      stream.getVideoTracks()[0].addEventListener("ended", stopSharing);

      await startPeerConnectionAndOffer(sessionCode);
      getSocket().emit("presenter:start-sharing", { sessionCode });

      setShareStatus("sharing");
    } catch (err) {
      console.error("[presenter] failed to start sharing:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not start screen sharing."
      );
      teardownPeerConnection();
      setShareStatus("idle");
    }
  }

  function stopSharing() {
    const socket = getSocket();
    teardownPeerConnection();
    socket.emit("presenter:stop-sharing", { sessionCode });
    setShareStatus("idle");
  }

  function endSession() {
    const socket = getSocket();
    teardownPeerConnection();
    socket.emit("presenter:end-session", { sessionCode });
    setShareStatus("ended");
    disconnectSocket();
  }

  const isEnded = shareStatus === "ended";
  const canStartSharing =
    connectionStatus === "receiver-connected" && shareStatus === "idle";
  const topStatus = isEnded
    ? { label: "Session ended", tone: "danger" as const }
    : connectionCopy[connectionStatus];

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-4">
          <SessionCodeDisplay code={sessionCode} />
          <StatusPill label={topStatus.label} tone={topStatus.tone} />
        </div>

        {joinUrl ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface py-6">
            <QrCode value={joinUrl} />
            <p className="text-xs text-muted">Scan to join as a viewer</p>
          </div>
        ) : (
          <PlaceholderPanel
            label="QR code"
            hint="Viewers will be able to scan this to join instantly."
            aspect="square"
          />
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            variant="primary"
            disabled={!canStartSharing}
            onClick={startSharing}
          >
            {shareStatus === "starting" ? "Starting…" : "Start Sharing"}
          </Button>
          <Button
            variant="secondary"
            disabled={isEnded || shareStatus !== "sharing"}
            onClick={stopSharing}
          >
            Stop Sharing
          </Button>
          <Button variant="danger" disabled={isEnded} onClick={endSession}>
            End Session
          </Button>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Status
          </p>
          <p className="mt-1 text-sm text-ink">
            {connectionStatus === "joining" && "Connecting to the session…"}
            {connectionStatus === "reconnecting" &&
              "Connection dropped — attempting to reconnect…"}
            {connectionStatus === "restored" &&
              "Reconnected. Restoring session state…"}
            {connectionStatus === "waiting-for-receiver" &&
              "Share your session code or QR with a viewer to connect."}
            {connectionStatus === "receiver-connected" &&
              shareStatus === "idle" &&
              "A viewer is connected. Start sharing when you're ready."}
            {shareStatus === "starting" &&
              "Choose a screen, window, or tab in the picker to begin."}
            {connectionStatus === "receiver-connected" &&
              shareStatus === "sharing" &&
              "Your screen is being shared with the connected viewer."}
            {shareStatus === "ended" &&
              "This session has ended. Create a new session to share again."}
            {connectionStatus === "error" &&
              (errorMessage ?? "Something went wrong connecting this session.")}
            {connectionStatus !== "error" &&
              shareStatus === "idle" &&
              errorMessage && <span className="text-danger">{errorMessage}</span>}
          </p>
        </div>
      </div>
    </main>
  );
}
