import { useCallback, useState } from "react";
import { Link } from "react-router";
import clsx from "clsx";

import { Page } from "@/components/shared/Page";
import { Button, Select } from "@/components/ui";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useRealtime } from "@/hooks/useRealtime";
import { ACTIVITY_META, type ActivityLog } from "@/@types/activity";
import { listActivity, markAllActivityRead } from "@/services/activityService";

const PAGE_SIZE = 40;

const typeOptions = [
  { value: "", label: "Tüm olaylar" },
  ...Object.entries(ACTIVITY_META).map(([k, v]) => ({ value: k, label: v.label })),
];

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Bugün";
  if (d.toDateString() === y.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Şirket aktivite akışı — zaman çizelgesi, gün bazlı gruplanmış, canlı güncellenir. */
export default function ActivityPage() {
  const [type, setType] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [live, setLive] = useState<ActivityLog[]>([]);

  const fetchPage = useCallback(
    (page: number) => listActivity({ page, pageSize: PAGE_SIZE, unreadOnly: unreadOnly || undefined }),
    [unreadOnly],
  );
  const { items, total, loading, hasMore, loadMore } = useInfiniteList<ActivityLog>(fetchPage);

  useRealtime<ActivityLog>("activity", (row) => setLive((p) => [row, ...p]));

  const all = [...live, ...items].filter((x) => !type || x.type === type);
  const groups = all.reduce<Record<string, ActivityLog[]>>((acc, row) => {
    const g = groupLabel(row.createdAt);
    (acc[g] ??= []).push(row);
    return acc;
  }, {});

  return (
    <Page title="Aktivite">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Aktivite Akışı</h2>
            <p className="text-sm text-gray-400 dark:text-dark-300">{total} olay • canlı</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select data={typeOptions} value={type} onChange={(e) => setType(e.target.value)} className="w-52" />
            <Button variant={unreadOnly ? "filled" : "outlined"} color="primary" onClick={() => setUnreadOnly((v) => !v)}>
              Sadece okunmamış
            </Button>
            <Button variant="outlined" onClick={() => markAllActivityRead().then(() => window.location.reload())}>
              Tümünü okundu say
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-8">
          {Object.entries(groups).map(([day, rows]) => (
            <section key={day}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{day}</h3>
              <ol className="relative ml-3 border-l-2 border-gray-200 dark:border-dark-500">
                {rows.map((row) => {
                  const meta = ACTIVITY_META[row.type] ?? ACTIVITY_META.SYSTEM;
                  return (
                    <li key={row.id} className="mb-5 ml-5">
                      <span className={clsx("absolute -left-[9px] mt-1.5 size-4 rounded-full ring-4 ring-white dark:ring-dark-900", meta.color)} />
                      <div className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm dark:border-dark-600 dark:bg-dark-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className={clsx("font-medium", row.read ? "text-gray-700 dark:text-dark-100" : "text-gray-900 dark:text-dark-50")}>
                            {row.link ? <Link to={row.link} className="hover:text-primary-600">{row.title}</Link> : row.title}
                          </p>
                          <span className="text-xs text-gray-400">
                            {new Date(row.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-dark-200">{row.description}</p>
                        <p className="mt-2 text-xs text-gray-400">
                          <span className={clsx("mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white", meta.color)}>{meta.label}</span>
                          {row.userName ?? ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {all.length === 0 && !loading && (
            <p className="py-16 text-center text-gray-400">Henüz aktivite yok.</p>
          )}
          <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
        </div>
      </div>
    </Page>
  );
}
