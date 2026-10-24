import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import clsx from "clsx";
import { TbMessages } from "react-icons/tb";

import { Page } from "@/components/shared/Page";
import { useAuthContext } from "@/app/contexts/auth/context";
import { useRealtime } from "@/hooks/useRealtime";
import type { ChatMessage, ChatReadEvent, ChatUser, Conversation } from "@/@types/chat";
import {
  listChatUsers,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  startConversation,
} from "@/services/chatService";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";

/**
 * Sohbet sayfası. URL parametreleri:
 *   ?conversation=ID            → sohbeti aç
 *   ?userId=ID&message=metin    → kullanıcıyla sohbet başlat, metni taslağa koy (göndermez)
 */
export default function ChatPage() {
  const { user } = useAuthContext();
  const meId = user?.id ?? "";
  const [params, setParams] = useSearchParams();

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const activeRef = useRef<Conversation | null>(null);
  activeRef.current = active;

  const refreshList = useCallback(async () => {
    try {
      setConversations(await listConversations());
    } catch {
      /* sessiz */
    }
  }, []);

  useEffect(() => {
    setListLoading(true);
    Promise.all([listChatUsers(), listConversations()])
      .then(([u, c]) => {
        setUsers(u);
        setConversations(c);
      })
      .catch(() => toast.error("Sohbetler yüklenemedi"))
      .finally(() => setListLoading(false));
  }, []);

  const openConversation = useCallback(async (c: Conversation) => {
    setActive(c);
    setMessages([]);
    setMsgLoading(true);
    try {
      const res = await listMessages(c.id, { limit: 50 });
      setMessages(res.items);
      setHasMore(res.hasMore);
      if (c.unreadCount > 0) {
        markConversationRead(c.id).catch(() => void 0);
        setConversations((p) => p.map((x) => (x.id === c.id ? { ...x, unreadCount: 0 } : x)));
      }
    } catch {
      toast.error("Mesajlar yüklenemedi");
    } finally {
      setMsgLoading(false);
    }
  }, []);

  const startWith = useCallback(
    async (u: ChatUser, prefill?: string) => {
      try {
        const c = await startConversation(u.id);
        setConversations((p) => (p.some((x) => x.id === c.id) ? p : [c, ...p]));
        if (prefill) setDrafts((d) => ({ ...d, [c.id]: prefill }));
        await openConversation(c);
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Sohbet başlatılamadı");
      }
    },
    [openConversation],
  );

  // URL parametreleri (bir kez)
  const handledParams = useRef(false);
  useEffect(() => {
    if (handledParams.current || listLoading) return;
    const convId = params.get("conversation");
    const userId = params.get("userId");
    const message = params.get("message");
    if (convId) {
      const c = conversations.find((x) => x.id === convId);
      if (c) void openConversation(c);
      handledParams.current = true;
      setParams({}, { replace: true });
    } else if (userId) {
      handledParams.current = true;
      const u = users.find((x) => x.id === userId);
      setParams({}, { replace: true });
      if (u) void startWith(u, message ?? undefined);
      else toast.error("Kullanıcı bulunamadı");
    } else {
      handledParams.current = true;
    }
  }, [listLoading, conversations, users, params, setParams, openConversation, startWith]);

  // Canlı: yeni mesaj
  useRealtime<ChatMessage>("chat:message", (m) => {
    const cur = activeRef.current;
    if (cur && m.conversationId === cur.id) {
      setMessages((p) => (p.some((x) => x.id === m.id) ? p : [...p, m]));
      if (m.senderId !== meId) markConversationRead(cur.id).catch(() => void 0);
    }
    setConversations((p) => {
      const idx = p.findIndex((c) => c.id === m.conversationId);
      if (idx === -1) {
        void refreshList();
        return p;
      }
      const c = p[idx];
      const isActive = cur?.id === c.id;
      const updated: Conversation = {
        ...c,
        lastMessage: m,
        updatedAt: m.createdAt,
        unreadCount: m.senderId === meId || isActive ? c.unreadCount : c.unreadCount + 1,
      };
      return [updated, ...p.filter((x) => x.id !== c.id)];
    });
  });

  // Canlı: karşı taraf okudu
  useRealtime<ChatReadEvent>("chat:read", (ev) => {
    if (ev.readBy === meId) return;
    const cur = activeRef.current;
    if (cur && ev.conversationId === cur.id) {
      setMessages((p) => p.map((m) => (m.senderId === meId && !m.readAt ? { ...m, readAt: ev.readAt } : m)));
    }
  });

  const loadMore = async () => {
    if (!active || msgLoading || !hasMore || messages.length === 0) return;
    setMsgLoading(true);
    try {
      const res = await listMessages(active.id, { before: messages[0].id, limit: 50 });
      setMessages((p) => [...res.items, ...p]);
      setHasMore(res.hasMore);
    } finally {
      setMsgLoading(false);
    }
  };

  const send = async () => {
    if (!active) return;
    const text = (drafts[active.id] ?? "").trim();
    if (!text) return;
    try {
      const m = await sendMessage(active.id, text);
      setDrafts((d) => ({ ...d, [active.id]: "" }));
      setMessages((p) => (p.some((x) => x.id === m.id) ? p : [...p, m]));
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Mesaj gönderilemedi");
    }
  };

  return (
    <Page title="Sohbet">
      <div className="w-full px-(--margin-x) py-4">
        <div className="flex h-[calc(100vh-9.5rem)] min-h-[520px] overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-700">
          {/* Sol panel */}
          <aside className={clsx("w-full shrink-0 border-r border-gray-150 lg:w-80 dark:border-dark-600", active && "hidden lg:block")}>
            <ConversationList
              conversations={conversations}
              users={users}
              activeId={active?.id ?? null}
              loading={listLoading}
              onSelect={(c) => void openConversation(c)}
              onStartWith={(u) => void startWith(u)}
            />
          </aside>

          {/* Sağ panel */}
          <section className={clsx("min-w-0 flex-1 bg-gray-50/60 dark:bg-dark-800/40", !active && "hidden lg:flex lg:items-center lg:justify-center")}>
            {active ? (
              <MessageThread
                conversation={active}
                messages={messages}
                meId={meId}
                loading={msgLoading}
                hasMore={hasMore}
                draft={drafts[active.id] ?? ""}
                onDraftChange={(v) => setDrafts((d) => ({ ...d, [active.id]: v }))}
                onSend={send}
                onLoadMore={() => void loadMore()}
                onBack={() => setActive(null)}
              />
            ) : (
              <div className="text-center">
                <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary-50 text-primary-500 dark:bg-primary-500/15">
                  <TbMessages className="size-10" />
                </div>
                <p className="mt-4 font-medium text-gray-700 dark:text-dark-100">Mesajlaşmaya Başlamak İçin Sohbet Seçin</p>
                <p className="mt-1 text-sm text-gray-400">Soldan bir kişi seçin veya + ile yeni sohbet başlatın</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}
