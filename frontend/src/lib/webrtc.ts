// Minimal, MVP-only config: a single public STUN server so peers on
// different networks can discover their public address. No TURN — if
// direct/STUN connectivity fails (e.g. symmetric NATs), the connection
// simply won't establish. Revisit if that turns out to matter in practice.
export const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
