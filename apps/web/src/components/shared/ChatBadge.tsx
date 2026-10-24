import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { TbMessages } from "react-icons/tb";

import { Button } from "@/components/ui";
import { useRealtime } from "@/hooks/useRealtime";
import { useAuthContext } from "@/app/contexts/auth/context";
import { chatUnreadCount } from "@/services/chatService";
import type { ChatMessage, ChatReadEvent } from "@/@types/chat";

/** Üst bar sohbet ikonu: okunmamış mesaj sayısı, Socket.io ile canlı */
export function ChatBadge() {
  const { user } = useAuthContext();
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  const refresh = () => chatUnreadCount().then(setCount).catch(() => void 0);

  useEffect(() => {
    void refresh();
  }, [pathname]);

  useRealtime<ChatMessage>("chat:message", (m) => {
    if (m.senderId !== user?.id && pathname !== "/chat") setCount((c) => c + 1);
  });
  useRealtime<ChatReadEvent>("chat:read", (ev) => {
    if (ev.readBy === user?.id) void refresh();
  });

  return (
    <Button
      component={Link}
      to="/chat"
      variant="flat"
      isIcon
      className="relative size-9 rounded-full"
      title="Sohbet"
    >
      <TbMessages className="size-6 text-gray-900 dark:text-dark-100" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
