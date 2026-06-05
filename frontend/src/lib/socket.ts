import { io, Socket } from "socket.io-client";

const URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

// Lazily creates a single shared connection using the current token. Creating it
// on demand (rather than in an effect) avoids parent/child mount-order races.
export function ensureSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem("token");
    socket = io(URL, {
      auth: { token },
      transports: ["websocket"],
    });
  }
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

// Called on login/logout so the next connection picks up the new token.
export function resetSocket(): void {
  socket?.disconnect();
  socket = null;
}
