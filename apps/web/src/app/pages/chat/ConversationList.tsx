import { useMemo, useState } from "react";
import clsx from "clsx";
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { Avatar, Input } from "@/components/ui";
import type { ChatUser, Conversation } from "@/@types/chat";
import { formatChatTime } from "./helpers";

interface Props {
  conversations: Conversation[];
  users: ChatUser[];
  activeId: string | null;
  loading: boolean;
  onSelect: (c: Conversation) => void;
  onStartWith: (u: ChatUser) => void;
}

/** Sol panel: kullanıcı şeridi + sohbet kartları (okunmamış rozetli) + arama */
export function ConversationList({ conversations, users, activeId, loading, onSelect, onStartWith }: Props) {
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState(false);

  const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/\s+/g, "");
  const filtered = useMemo(
    () => conversations.filter((c) => !search || norm(c.otherUser.name).includes(norm(search))),
    [conversations, search],
  );
  const filteredUsers = useMemo(
    () => users.filter((u) => !search || norm(u.name).includes(norm(search))),
    [users, search],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Başlık + yeni sohbet */}
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">Sohbet</h2>
        <button
          type="button"
          onClick={() => setPicking((p) => !p)}
          className={clsx(
            "flex size-8 items-center justify-center rounded-full transition",
            picking ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-100",
          )}
          title={picking ? "Kapat" : "Yeni sohbet"}
        >
          {picking ? <XMarkIcon className="size-4" /> : <PlusIcon className="size-5" />}
        </button>
      </div>

      {/* Kullanıcı şeridi */}
      {users.length > 0 && !picking && (
        <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onStartWith(u)}
              className="flex w-14 shrink-0 flex-col items-center gap-1"
              title={u.name}
            >
              <Avatar size={11} src={u.avatarUrl ?? undefined} name={u.name} initialColor="auto" classNames={{ display: "rounded-full ring-2 ring-primary-500/30" }} />
              <span className="w-full truncate text-center text-tiny text-gray-500 dark:text-dark-300">
                {u.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pt-3">
        <Input
          placeholder={picking ? "Kullanıcı ara..." : "Ara..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefix={<MagnifyingGlassIcon className="size-4" />}
          classNames={{ input: "h-9 text-sm" }}
        />
      </div>

      <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
        {picking ? (
          <>
            <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Yeni Sohbet Başlat</p>
            {filteredUsers.length === 0 && <p className="py-6 text-center text-sm text-gray-400">Kullanıcı bulunamadı</p>}
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => { onStartWith(u); setPicking(false); }}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-gray-100 dark:hover:bg-dark-600"
              >
                <Avatar size={10} src={u.avatarUrl ?? undefined} name={u.name} initialColor="auto" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-50">{u.name}</p>
                  <p className="truncate text-xs text-gray-400">{u.email}</p>
                </div>
              </button>
            ))}
          </>
        ) : (
          <>
            {loading && conversations.length === 0 && <p className="py-6 text-center text-sm text-gray-400">Yükleniyor...</p>}
            {!loading && filtered.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-gray-600 dark:text-dark-200">Henüz sohbet yok</p>
                <p className="mt-1 text-xs text-gray-400">Yeni sohbet başlatmak için + butonuna tıklayın</p>
              </div>
            )}
            {filtered.map((c) => {
              const active = c.id === activeId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition",
                    active
                      ? "bg-primary-600 text-white shadow-md"
                      : "hover:bg-gray-100 dark:hover:bg-dark-600",
                  )}
                >
                  <Avatar
                    size={11}
                    src={c.otherUser.avatarUrl ?? undefined}
                    name={c.otherUser.name}
                    initialColor="auto"
                    classNames={{ display: "rounded-full" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={clsx("truncate text-sm font-semibold", active ? "text-white" : "text-gray-800 dark:text-dark-50")}>
                        {c.otherUser.name}
                      </p>
                      {c.lastMessage && (
                        <span className={clsx("shrink-0 text-tiny", active ? "text-white/80" : "text-gray-400")}>
                          {formatChatTime(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={clsx("truncate text-xs", active ? "text-white/80" : c.unreadCount > 0 ? "font-medium text-gray-700 dark:text-dark-100" : "text-gray-400")}>
                        {c.lastMessage?.content ?? "Henüz mesaj yok"}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className={clsx("flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-tiny font-bold", active ? "bg-white text-primary-600" : "bg-primary-600 text-white")}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
