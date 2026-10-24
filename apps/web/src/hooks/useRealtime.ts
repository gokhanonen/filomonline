import { useEffect, useRef } from "react";
import { useAuthContext } from "@/app/contexts/auth/context";
import { connectRealtime, disconnectRealtime } from "@/realtime/socket";

/**
 * Bir Socket.io olayına abone olur. Aktif şirket değişince bağlantı yenilenir.
 * Handler'ın en güncel sürümü ref üzerinden çağrılır (yeniden abone olmaz).
 */
export function useRealtime<T = unknown>(event: string, handler: (payload: T) => void) {
  const { isAuthenticated, activeCompanyId } = useAuthContext();
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId) {
      disconnectRealtime();
      return;
    }
    const s = connectRealtime();
    if (!s) return;
    const fn = (payload: T) => ref.current(payload);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event, isAuthenticated, activeCompanyId]);
}
