import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, STORAGE_KEYS } from "@/configs/auth";

/**
 * Tek paylaşımlı Socket.io bağlantısı. Token + aktif şirket handshake'te gider;
 * şirket değişince `reconnectRealtime()` ile yeniden bağlanılır.
 */
let socket: Socket | null = null;

function origin(): string {
  // "http://host:3001/api/v1" -> "http://host:3001"
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return window.location.origin;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectRealtime(): Socket | null {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  const companyId = localStorage.getItem(STORAGE_KEYS.activeCompanyId);
  if (!token || !companyId) return null;
  if (socket) {
    const auth = socket.auth as { token?: string; companyId?: string };
    if (auth.token === token && auth.companyId === companyId && socket.connected) return socket;
    socket.disconnect();
    socket = null;
  }
  socket = io(origin(), {
    auth: { token, companyId },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
  });
  return socket;
}

export function reconnectRealtime() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return connectRealtime();
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}
