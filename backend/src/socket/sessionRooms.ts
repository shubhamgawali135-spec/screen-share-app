// In-memory only — resets on server restart, and won't work across multiple
// server instances. Fine for MVP (single presenter, single receiver).
// Temporary disconnects clear a socket's slot but leave the rest of the room
// (including isSharing) intact so a reconnecting client can pick back up —
// only an explicit presenter:end-session drops the whole room via clearRoom.

interface SessionRoom {
  presenterSocketId: string | null;
  receiverSocketId: string | null;
  isSharing: boolean;
}

const rooms = new Map<string, SessionRoom>();

function getOrCreateRoom(sessionCode: string): SessionRoom {
  let room = rooms.get(sessionCode);
  if (!room) {
    room = { presenterSocketId: null, receiverSocketId: null, isSharing: false };
    rooms.set(sessionCode, room);
  }
  return room;
}

export function getRoom(sessionCode: string): SessionRoom | undefined {
  return rooms.get(sessionCode);
}

export function setPresenter(sessionCode: string, socketId: string): void {
  const room = getOrCreateRoom(sessionCode);
  room.presenterSocketId = socketId;
}

export function setReceiver(sessionCode: string, socketId: string): void {
  const room = getOrCreateRoom(sessionCode);
  room.receiverSocketId = socketId;
}

export function setSharing(sessionCode: string, isSharing: boolean): void {
  const room = getOrCreateRoom(sessionCode);
  room.isSharing = isSharing;
}

// Removes a socket from whichever slot it occupies in a room, and clears
// the room entirely once both slots are empty. Called on disconnect. Note
// this does NOT touch isSharing — a temporary drop shouldn't erase the fact
// that sharing was in progress, since the other side may reconnect shortly.
export function removeSocket(sessionCode: string, socketId: string): void {
  const room = rooms.get(sessionCode);
  if (!room) return;

  if (room.presenterSocketId === socketId) {
    room.presenterSocketId = null;
  }
  if (room.receiverSocketId === socketId) {
    room.receiverSocketId = null;
  }

  if (!room.presenterSocketId && !room.receiverSocketId) {
    rooms.delete(sessionCode);
  }
}

// Explicit teardown for when a presenter ends the session — as opposed to
// removeSocket, which only clears one slot on disconnect, this drops the
// whole room immediately so no stale state lingers after end-session.
export function clearRoom(sessionCode: string): void {
  rooms.delete(sessionCode);
}
