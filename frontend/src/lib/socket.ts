import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

// Single shared socket instance for the whole app. Created lazily and left
// disconnected until a page explicitly calls .connect() — pages are
// responsible for connecting/disconnecting around their own lifecycle.
export function getSocket(): AppSocket {
  if (!socket) {
    if (!BACKEND_URL) {
      console.warn(
        "NEXT_PUBLIC_BACKEND_URL is not set. Copy .env.local.example to .env.local."
      );
    }

    socket = io(BACKEND_URL ?? "", {
      autoConnect: false,
      transports: ["websocket"],
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
