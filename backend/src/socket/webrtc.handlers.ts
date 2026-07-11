import { Server, Socket } from "socket.io";
import * as sessionRooms from "./sessionRooms";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  WebrtcOfferPayload,
  WebrtcAnswerPayload,
  WebrtcIceCandidatePayload,
  SessionCodePayload,
} from "./types";

type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// The other participant in the same session room — presenter's messages go
// to the receiver and vice versa. One presenter + one receiver only.
function getCounterpartSocketId(socket: TypedSocket): string | undefined {
  const { sessionCode, role } = socket.data;

  if (!sessionCode || !role) {
    return undefined;
  }

  const room = sessionRooms.getRoom(sessionCode);

  if (!room) {
    return undefined;
  }

  return role === "presenter"
    ? room.receiverSocketId ?? undefined
    : room.presenterSocketId ?? undefined;
}

export function registerWebrtcHandlers(
  io: TypedServer,
  socket: TypedSocket
): void {
  socket.on("webrtc:offer", (payload: WebrtcOfferPayload): void => {
    const counterpartSocketId = getCounterpartSocketId(socket);

    if (!counterpartSocketId) {
      socket.emit("session:error", {
        message: "No peer connected to receive the offer",
      });
      return;
    }

    io.to(counterpartSocketId).emit("webrtc:offer", payload);
  });

  socket.on("webrtc:answer", (payload: WebrtcAnswerPayload): void => {
    const counterpartSocketId = getCounterpartSocketId(socket);

    if (!counterpartSocketId) {
      socket.emit("session:error", {
        message: "No peer connected to receive the answer",
      });
      return;
    }

    io.to(counterpartSocketId).emit("webrtc:answer", payload);
  });

  socket.on(
    "webrtc:ice-candidate",
    (payload: WebrtcIceCandidatePayload): void => {
      const counterpartSocketId = getCounterpartSocketId(socket);

      if (!counterpartSocketId) {
        return;
      }

      io.to(counterpartSocketId).emit("webrtc:ice-candidate", payload);
    }
  );

  socket.on(
    "presenter:start-sharing",
    (payload: SessionCodePayload): void => {
      if (socket.data.role !== "presenter") {
        socket.emit("session:error", {
          message: "Only the presenter can start sharing",
        });
        return;
      }

      sessionRooms.setSharing(payload.sessionCode, true);

      const counterpartSocketId = getCounterpartSocketId(socket);

      if (!counterpartSocketId) {
        socket.emit("session:error", {
          message: "No receiver connected",
        });
        return;
      }

      io.to(counterpartSocketId).emit("session:sharing-started", {
        sessionCode: payload.sessionCode,
      });
    }
  );

  socket.on(
    "presenter:stop-sharing",
    (payload: SessionCodePayload): void => {
      if (socket.data.role !== "presenter") {
        socket.emit("session:error", {
          message: "Only the presenter can stop sharing",
        });
        return;
      }

      sessionRooms.setSharing(payload.sessionCode, false);

      const counterpartSocketId = getCounterpartSocketId(socket);

      if (!counterpartSocketId) {
        return;
      }

      io.to(counterpartSocketId).emit("session:sharing-stopped", {
        sessionCode: payload.sessionCode,
      });
    }
  );
}