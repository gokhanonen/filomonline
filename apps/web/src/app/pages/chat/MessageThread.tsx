import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { PaperAirplaneIcon, ChevronLeftIcon, CheckIcon } from "@heroicons/react/24/outline";
import { TbCar } from "react-icons/tb";
import { Link } from "react-router";

import { Avatar, Button, Spinner } from "@/components/ui";
import type { ChatMessage, Conversation } from "@/@types/chat";
import { dayLabel, groupMessages, linkify, relativeTimeTr } from "./helpers";

interface Props {
  conversation: Conversation;
  messages: ChatMessage[];
  meId: string;
  loading: boolean;
  hasMore: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => Promise<void>;
  onLoadMore: () => void;
  onBack?: () => void;
}

/** Sağ panel: gruplanmış balonlar, tarih ayraçları, otomatik kaydırma, gönderme alanı */
export function MessageThread({
  conversation, messages, meId, loading, hasMore, draft, onDraftChange, onSend, onLoadMore, onBack,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [sending, setSending] = useState(false);
  const stickToBottom = useRef(true);

  // Yeni mesaj gelince alta kaydır (kullanıcı yukarıdaysa kaydırma)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, conversation.id]);

  useEffect(() => {
    textRef.current?.focus();
  }, [conversation.id]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && hasMore && !loading) onLoadMore();
  };

  const submit = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await onSend();
      stickToBottom.current = true;
    } finally {
      setSending(false);
      textRef.current?.focus();
    }
  };

  const groups = groupMessages(messages, meId);
  const other = conversation.otherUser;

  return (
    <div className="flex h-full flex-col">
      {/* Başlık */}
      <div className="flex items-center gap-3 border-b border-gray-150 px-4 py-3 dark:border-dark-600">
        {onBack && (
          <button type="button" onClick={onBack} className="rounded-full p-1 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-dark-600">
            <ChevronLeftIcon className="size-5" />
          </button>
        )}
        <Avatar size={10} src={other.avatarUrl ?? undefined} name={other.name} initialColor="auto" classNames={{ display: "rounded-full" }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-800 dark:text-dark-50">{other.name}</p>
          <p className="truncate text-xs text-gray-400">{other.email}</p>
        </div>
        {conversation.vehicleId && (
          <Link to={`/vehicles/${conversation.vehicleId}`} className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-500/15 dark:text-primary-300">
            <TbCar className="size-4" /> Araç
          </Link>
        )}
      </div>

      {/* Mesajlar */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {hasMore && (
          <div className="text-center">
            <button type="button" onClick={onLoadMore} className="text-xs text-primary-600 hover:underline">
              {loading ? "Yükleniyor..." : "Önceki mesajları yükle"}
            </button>
          </div>
        )}
        {loading && messages.length === 0 && (
          <div className="flex justify-center py-10"><Spinner className="size-6" /></div>
        )}
        {!loading && messages.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            Henüz mesaj yok — ilk mesajı siz gönderin.
          </div>
        )}
        {groups.map((g, gi) => {
          const first = g.messages[0];
          const prevGroup = groups[gi - 1];
          const showDay =
            !prevGroup ||
            dayLabel(prevGroup.messages[0].createdAt) !== dayLabel(first.createdAt);
          const last = g.messages[g.messages.length - 1];
          return (
            <Fragment key={first.id}>
              {showDay && (
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-150 dark:bg-dark-600" />
                  <span className="rounded-full bg-gray-100 px-3 py-0.5 text-tiny font-medium text-gray-500 dark:bg-dark-600 dark:text-dark-200">
                    {dayLabel(first.createdAt)}
                  </span>
                  <div className="h-px flex-1 bg-gray-150 dark:bg-dark-600" />
                </div>
              )}
              <div className={clsx("flex items-end gap-2", g.mine ? "flex-row-reverse" : "flex-row")}>
                {!g.mine && (
                  <Avatar size={8} src={other.avatarUrl ?? undefined} name={other.name} initialColor="auto" classNames={{ display: "rounded-full" }} />
                )}
                <div className={clsx("flex max-w-[78%] flex-col gap-1", g.mine ? "items-end" : "items-start")}>
                  {g.messages.map((m, i) => (
                    <div
                      key={m.id}
                      className={clsx(
                        "whitespace-pre-wrap break-words px-3.5 py-2 text-sm shadow-sm",
                        g.mine
                          ? "bg-primary-600 text-white"
                          : "bg-white text-gray-800 ring-1 ring-gray-150 dark:bg-dark-600 dark:text-dark-50 dark:ring-dark-500",
                        "rounded-2xl",
                        g.mine
                          ? i === g.messages.length - 1 ? "rounded-br-md" : ""
                          : i === g.messages.length - 1 ? "rounded-bl-md" : "",
                      )}
                    >
                      {linkify(m.content).map((p, pi) =>
                        p.type === "link" ? (
                          <a key={pi} href={p.value} target="_blank" rel="noreferrer" className={clsx("underline", g.mine ? "text-white" : "text-primary-600")}>
                            {p.value}
                          </a>
                        ) : (
                          <span key={pi}>{p.value}</span>
                        ),
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-1 px-1 text-tiny text-gray-400">
                    <span>{relativeTimeTr(last.createdAt)}</span>
                    {g.mine && (
                      <span className={clsx("flex", last.readAt ? "text-primary-500" : "text-gray-300")} title={last.readAt ? "Okundu" : "İletildi"}>
                        <CheckIcon className="size-3" />
                        <CheckIcon className="-ml-1.5 size-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Gönderme */}
      <div className="border-t border-gray-150 p-3 dark:border-dark-600">
        <div className="flex items-end gap-2 rounded-2xl bg-gray-100 p-2 dark:bg-dark-600">
          <textarea
            ref={textRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={Math.min(6, Math.max(1, draft.split("\n").length))}
            placeholder="Bir mesaj yazın... (Enter gönderir, Shift+Enter yeni satır)"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-dark-50"
          />
          <Button color="primary" isIcon className="size-9 rounded-full" onClick={submit} disabled={!draft.trim() || sending} title="Gönder">
            <PaperAirplaneIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
