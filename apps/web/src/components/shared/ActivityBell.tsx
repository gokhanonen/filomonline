import { Fragment, useCallback, useEffect, useState } from "react";
import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react";
import { Link } from "react-router";
import { toast } from "sonner";
import clsx from "clsx";

import { Badge, Button } from "@/components/ui";
import { ACTIVITY_META, type ActivityLog } from "@/@types/activity";
import {
  listActivity,
  markActivityRead,
  markAllActivityRead,
  unreadActivityCount,
} from "@/services/activityService";
import { useRealtime } from "@/hooks/useRealtime";
import AlarmIcon from "@/assets/dualicons/alarm.svg?react";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
}

/**
 * Üst bardaki bildirim zili: aktivite günlüğü (okunmamış sayısı) + Socket.io
 * ile anlık güncelleme. Tıklanan kayıt okundu işaretlenir ve ilgili ekrana gider.
 */
export function ActivityBell() {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        listActivity({ pageSize: 15 }),
        unreadActivityCount(),
      ]);
      setItems(list.items);
      setUnread(count);
    } catch {
      /* sessiz */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime<ActivityLog>("activity", (row) => {
    setItems((prev) => [row, ...prev].slice(0, 15));
    setUnread((n) => n + 1);
    toast(row.title, { description: row.description });
  });

  const readOne = async (row: ActivityLog) => {
    if (row.read) return;
    setItems((p) => p.map((x) => (x.id === row.id ? { ...x, read: true } : x)));
    setUnread((n) => Math.max(0, n - 1));
    markActivityRead(row.id).catch(() => void 0);
  };
  const readAll = async () => {
    setItems((p) => p.map((x) => ({ ...x, read: true })));
    setUnread(0);
    markAllActivityRead().catch(() => void 0);
  };

  return (
    <Popover className="relative flex">
      <PopoverButton
        as={Button}
        variant="flat"
        isIcon
        className="relative size-9 rounded-full"
        title="Bildirimler"
      >
        <AlarmIcon className="size-6 text-gray-900 dark:text-dark-100" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </PopoverButton>
      <Transition
        as={Fragment}
        enter="transition ease-out"
        enterFrom="opacity-0 translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-2"
      >
        <PopoverPanel
          anchor={{ to: "bottom end", gap: 8 }}
          className="z-70 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-gray-150 bg-white shadow-soft dark:border-dark-800 dark:bg-dark-700 dark:shadow-none"
        >
          <div className="flex items-center justify-between border-b border-gray-150 px-4 py-3 dark:border-dark-600">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-800 dark:text-dark-100">Bildirimler</h3>
              {unread > 0 && <Badge color="error" variant="soft" className="h-5 px-1.5 text-xs">{unread}</Badge>}
            </div>
            <button type="button" onClick={readAll} className="text-xs text-primary-600 hover:underline dark:text-primary-400">
              Tümünü okundu say
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading && items.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Yükleniyor...</p>}
            {!loading && items.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Henüz aktivite yok.</p>}
            {items.map((row) => {
              const meta = ACTIVITY_META[row.type] ?? ACTIVITY_META.SYSTEM;
              const inner = (
                <>
                  <span className={clsx("mt-1.5 size-2.5 shrink-0 rounded-full", meta.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={clsx("truncate text-sm", row.read ? "text-gray-600 dark:text-dark-200" : "font-semibold text-gray-800 dark:text-dark-50")}>
                        {row.title}
                      </p>
                      <span className="shrink-0 text-tiny text-gray-400">{timeAgo(row.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-xs text-gray-500 dark:text-dark-300">{row.description}</p>
                    <p className="mt-0.5 text-tiny text-gray-400">{meta.label}{row.userName ? ` • ${row.userName}` : ""}</p>
                  </div>
                </>
              );
              const cls = clsx(
                "flex gap-3 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-dark-600",
                !row.read && "bg-primary-50/40 dark:bg-primary-500/5",
              );
              return row.link ? (
                <Link key={row.id} to={row.link} onClick={() => readOne(row)} className={cls}>{inner}</Link>
              ) : (
                <div key={row.id} onClick={() => readOne(row)} className={clsx(cls, "cursor-pointer")}>{inner}</div>
              );
            })}
          </div>
          <div className="border-t border-gray-150 px-4 py-2 text-center dark:border-dark-600">
            <Link to="/activity" className="text-xs text-primary-600 hover:underline dark:text-primary-400">Tüm aktiviteler</Link>
          </div>
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}
