import { Server, Socket } from "socket.io";
import * as sessionService from "../services/session.service";
import * as sessionRooms from "./sessionRooms";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  JoinSessionPayload,
  JoinSessionAck,
  JoinSessionErrorCode,
} from "./types";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function emitError(
  socket: TypedSocket,
  message: string,
  ack?: (response: JoinSessionAck) => void,
  code?: JoinSessionErrorCode
) {
  socket.emit("session:error", { message });
  ack?.({ ok: false, error: message, code });
}

export function registerSessionHandlers(io: TypedServer, socket: TypedSocket): void {
  socket.on("presenter:join-session", async (payload: JoinSessionPayload, ack) => {
    const sessionCode = payload?.sessionCode;

    if (!sessionCode) {
      return emitError(socket, "sessionCode is required", ack);
    }

    let session;
    try {
      session = await sessionService.getSessionByCode(sessionCode);
    } catch (err) {
      console.error("[socket] presenter join lookup failed:", err);
      return emitError(socket, "Failed to look up session", ack);
    }

    if (!session) {
      return emitError(socket, "Invalid session code", ack, "invalid_session");
    }

    if (session.status === "ended") {
      return emitError(socket, "Session has ended", ack, "session_ended");
    }

    const existingRoom = sessionRooms.getRoom(sessionCode);
    if (existingRoom?.presenterSocketId && existingRoom.presenterSocketId !== socket.id) {
      return emitError(
        socket,
        "A presenter is already connected to this session",
        ack,
        "role_taken"
      );
    }

    socket.join(sessionCode);
    socket.data.sessionCode = sessionCode;
    socket.data.role = "presenter";
    sessionRooms.setPresenter(sessionCode, socket.id);

    try {
      await sessionService.updatePresenterSocketId(sessionCode, socket.id);
    } catch (err) {
      // Non-fatal: the in-memory room state is already correct and is what
      // the live session flow relies on. Log and continue.
      console.error("[socket] failed to persist presenter_socket_id:", err);
    }

    // Read the room again after registering, so the ack reflects the
    // receiver/sharing state as of right now — this is what lets a
    // reconnecting presenter restore its UI without waiting on more events.
    const room = sessionRooms.getRoom(sessionCode);

    console.log(`[socket] presenter joined session ${sessionCode} (${socket.id})`);
    ack?.({
      ok: true,
      session: {
        sessionCode,
        status: session.status,
        receiverConnected: !!room?.receiverSocketId,
        isSharing: !!room?.isSharing,
      },
    });
  });

  socket.on("receiver:join-session", async (payload: JoinSessionPayload, ack) => {
    const sessionCode = payload?.sessionCode;

    if (!sessionCode) {
      return emitError(socket, "sessionCode is required", ack);
    }

    let session;
    try {
      session = await sessionService.getSessionByCode(sessionCode);
    } catch (err) {
      console.error("[socket] receiver join lookup failed:", err);
      return emitError(socket, "Failed to look up session", ack);
    }

    if (!session) {
      return emitError(socket, "Invalid session code", ack, "invalid_session");
    }

    if (session.status === "ended") {
      return emitError(socket, "Session has ended", ack, "session_ended");
    }

    const existingRoom = sessionRooms.getRoom(sessionCode);
    if (existingRoom?.receiverSocketId && existingRoom.receiverSocketId !== socket.id) {
      return emitError(
        socket,
        "A receiver is already connected to this session",
        ack,
        "role_taken"
      );
    }

    // Receiver is allowed to join even if the presenter isn't sharing yet
    // (or hasn't joined at all). The frontend is responsible for showing a
    // waiting state until screen sharing actually starts.
    socket.join(sessionCode);
    socket.data.sessionCode = sessionCode;
    socket.data.role = "receiver";
    sessionRooms.setReceiver(sessionCode, socket.id);

    const room = sessionRooms.getRoom(sessionCode);

    console.log(`[socket] receiver joined session ${sessionCode} (${socket.id})`);
    ack?.({
      ok: true,
      session: {
        sessionCode,
        status: session.status,
        receiverConnected: true,
        isSharing: !!room?.isSharing,
      },
    });

    // Fires on every successful receiver join, first time or reconnect —
    // the presenter side uses this to (re)build a fresh peer connection
    // when it's already sharing, since a reconnecting receiver's old
    // RTCPeerConnection is gone.
    const presenterSocketId = room?.presenterSocketId;
    if (presenterSocketId) {
      io.to(presenterSocketId).emit("session:receiver-joined", { sessionCode });
    }
  });

  socket.on("presenter:end-session", async (payload: JoinSessionPayload) => {
    if (socket.data.role !== "presenter") {
      return emitError(socket, "Only the presenter can end the session");
    }

    const sessionCode = socket.data.sessionCode ?? payload?.sessionCode;
    if (!sessionCode) {
      return emitError(socket, "No active session to end");
    }

    const room = sessionRooms.getRoom(sessionCode);
    const receiverSocketId = room?.receiverSocketId;

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("session:ended", { sessionCode });
      io.sockets.sockets.get(receiverSocketId)?.leave(sessionCode);
    }

    try {
      await sessionService.endSession(sessionCode);
    } catch (err) {
      console.error("[socket] failed to persist session end:", err);
    }

    sessionRooms.clearRoom(sessionCode);
    socket.leave(sessionCode);
    socket.data.sessionCode = undefined;
    socket.data.role = undefined;

    console.log(`[socket] session ended: ${sessionCode} (by presenter ${socket.id})`);
  });

  socket.on("disconnect", () => {
    const { sessionCode } = socket.data;
    if (sessionCode) {
      // Only clears this socket's slot — the room (and isSharing) survives
      // so a reconnect can pick back up. The session itself is only ever
      // ended explicitly, via presenter:end-session above.
      sessionRooms.removeSocket(sessionCode, socket.id);
    }
  });
}
