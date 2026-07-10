import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./types";
import { registerSessionHandlers } from "./session.handlers";
import { registerWebrtcHandlers } from "./webrtc.handlers";

export function initSocket(httpServer: HttpServer) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.clientOrigin,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("ping", () => {
      socket.emit("pong");
    });

    registerSessionHandlers(io, socket);
    registerWebrtcHandlers(io, socket);

    // This second disconnect listener is separate from the room-cleanup one
    // registered inside registerSessionHandlers; Socket.IO supports multiple
    // listeners per event, so both run.
    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}
