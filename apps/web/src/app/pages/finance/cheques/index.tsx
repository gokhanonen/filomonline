import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import clsx from "clsx";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  TbAlarm,
  TbAlertTriangle,
  TbArrowDownLeft,
  TbArrowUpRight,
  TbBuildingBank,
  TbCircleCheck,
  TbFilterOff,
  TbReceipt2,
  TbWallet,
} from "react-icons/tb";

import { Page } from "@/components/shared/Page";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { Button, Input } from "@/components/ui";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import type { Cheque, ChequeDirection, ChequeStatus, Currency } from "@/@types/finance";
import { listCheques } from "@/services/financeService";
import { CHEQUE_STATUS_LABEL, FinanceNav, Kpi, fmtMoney, useFinanceAccounts } from "../shared";
import { OperationModal, type OperationDefaults, type OperationMode } from "../OperationModal";
import { ChequeActionModal, type ChequeAction } from "./ChequeActionModal";
import { ChequeCard } from "./ChequeCard";
import { DateRangeInput } from "../movements/DateRangeInput";

const PAGE_SIZE = 24;

const STATUSES: Record<ChequeDirection, ChequeStatus[]> = {
  RECEIVED: ["PORTFOLIO", "IN_COLLECTION", "ENDORSED", "COLLECTED", "BOUNCED", "RETURNED"],
  ISSUED: ["ISSUED", "PAID"],
};
const OPEN_STATUSES: ChequeStatus[] = ["PORTFOLIO", "IN_COLLECTION", "ISSUED"];

type Money = Partial<Record<Currency, number>>;

function addMoney(acc: Money, c: Cheque) {
  acc[c.currency] = (acc[c.currency] ?? 0) + Number(c.amount || 0);
}

/** Döviz bazında toplam: "125.000,00 ₺ + 2.000,00 €" */
function fmtMulti(m: Money) {
  const parts = (Object.entries(m) as [Currency, number][])
    .filter(([, v]) => v)
    .sort(([a], [b]) => (a === "TRY" ? -1 : b === "TRY" ? 1 : a.localeCompare(b)))
    .map(([cur, v]) => fmtMoney(v, cur));
  return parts.length ? parts.join(" + ") : fmtMoney(0);
}

interface Stats {
  counts: Partial<Record<ChequeStatus, number>>;
  portfolio: Money;
  portfolioCount: number;
  inCollection: Money;
  inCollectionCount: number;
  issued: Money;
  issuedCount: number;
  dueSoon: Money;
  dueSoonCount: number;
  overdue: Money;
  overdueCount: number;
}

const emptyStats = (): Stats => ({
  counts: {},
  portfolio: {},
  portfolioCount: 0,
  inCollection: {},
  inCollectionCount: 0,
  issued: {},
  issuedCount: 0,
  dueSoon: {},
  dueSoonCount: 0,
  overdue: {},
  overdueCount: 0,
});

/** KPI + durum sayıları: açık durumlar tam liste, kapalı durumlar yalnızca adet */
function useChequeStats(direction: ChequeDirection, refreshKey: number) {
  const [stats, setStats] = useState<Stats>(emptyStats);
  useEffect(() => {
    let cancelled = false;
    const statuses = STATUSES[direction];
    Promise.all(
      statuses.map((status) =>
        listCheques({ direction, status, pageSize: OPEN_STATUSES.includes(status) ? 1000 : 1 }).then((r) => ({ status, ...r })),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const s = emptyStats();
        for (const r of results) {
          s.counts[r.status] = r.total;
          if (!OPEN_STATUSES.includes(r.status)) continue;
          for (const c of r.items) {
            if (c.status === "PORTFOLIO") {
              addMoney(s.portfolio, c);
              s.portfolioCount++;
            } else if (c.status === "IN_COLLECTION") {
              addMoney(s.inCollection, c);
              s.inCollectionCount++;
            } else if (c.status === "ISSUED") {
              addMoney(s.issued, c);
              s.issuedCount++;
            }
            const d = c.daysToDue;
            if (d !== null && d !== undefined) {
              if (d < 0) {
                addMoney(s.overdue, c);
                s.overdueCount++;
              } else if (d <= 7) {
                addMoney(s.dueSoon, c);
                s.dueSoonCount++;
              }
            }
          }
        }
        setStats(s);
      })
      .catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [direction, refreshKey]);
  return stats;
}

export default function FinanceChequesPage() {
  const { can } = useAuthContext();
  const canWrite = can("finance.write");
  const [searchParams] = useSearchParams();

  const [direction, setDirection] = useState<ChequeDirection>(() => (searchParams.get("direction") === "ISSUED" ? "ISSUED" : "RECEIVED"));
  const [status, setStatus] = useState<ChequeStatus | "">("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [op, setOp] = useState<{ mode: OperationMode; defaults?: OperationDefaults } | null>(null);
  const [action, setAction] = useState<{ cheque: Cheque; action: ChequeAction } | null>(null);

  const { accounts, reload: reloadAccounts } = useFinanceAccounts();
  const stats = useChequeStats(direction, refreshKey);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listCheques({
        page,
        pageSize: PAGE_SIZE,
        direction,
        status: status || undefined,
        search: debounced || undefined,
        dueFrom: dueFrom || undefined,
        dueTo: dueTo || undefined,
      });
    },
    [direction, status, debounced, dueFrom, dueTo, refreshKey],
  );

  const { items, total, loading, hasMore, loadMore } = useInfiniteList<Cheque>(fetchPage);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    void reloadAccounts();
  };

  const switchDirection = (d: ChequeDirection) => {
    if (d === direction) return;
    setDirection(d);
    setStatus("");
  };

  const statusChips = useMemo(() => {
    const list = STATUSES[direction];
    const all = list.reduce((s, k) => s + (stats.counts[k] ?? 0), 0);
    return [{ value: "" as const, label: "Tümü", count: all }, ...list.map((k) => ({ value: k, label: CHEQUE_STATUS_LABEL[k], count: stats.counts[k] ?? 0 }))];
  }, [direction, stats]);

  const hasFilters = !!(status || search || dueFrom || dueTo);
  const received = direction === "RECEIVED";

  return (
    <Page title="Finans - Çek & Senet">
      <div className="w-full space-y-4 px-(--margin-x) py-4">
        <FinanceNav
          actions={
            canWrite && (
              <>
                <Button
                  color="success"
                  className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
                  onClick={() => setOp({ mode: "collection", defaults: { module: "CHEQUE" } })}
                >
                  <TbArrowDownLeft className="size-4" /> Çek/Senet Al
                </Button>
                <Button
                  color="warning"
                  className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
                  onClick={() => setOp({ mode: "payment", defaults: { module: "CHEQUE" } })}
                >
                  <TbArrowUpRight className="size-4" /> Çek/Senet Ver
                </Button>
              </>
            )
          }
        />

        {/* Yön seçimi */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-xl border border-gray-200 bg-white p-1 shadow-xs dark:border-dark-600 dark:bg-dark-800 sm:w-auto">
            {(
              [
                { v: "RECEIVED", label: "Alınan", Icon: TbArrowDownLeft },
                { v: "ISSUED", label: "Verilen", Icon: TbArrowUpRight },
              ] as const
            ).map(({ v, label, Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => switchDirection(v)}
                className={clsx(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition sm:flex-none",
                  direction === v
                    ? v === "RECEIVED"
                      ? "bg-success text-white shadow-xs"
                      : "bg-warning text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-700",
                )}
              >
                <Icon className="size-4" />
                {label} Çek & Senetler
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Seri no, keşideci, banka..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4" />}
              className="w-full sm:w-60"
              classNames={{ root: "w-full sm:w-auto" }}
            />
            <DateRangeInput
              label="Vade"
              from={dueFrom}
              to={dueTo}
              onFromChange={setDueFrom}
              onToChange={setDueTo}
              className="w-full sm:w-80"
            />
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {received ? (
            <>
              <Kpi label="Portföydeki Toplam" value={fmtMulti(stats.portfolio)} hint={`${stats.portfolioCount} adet`} tone="info" Icon={TbWallet} />
              <Kpi label="Tahsildeki" value={fmtMulti(stats.inCollection)} hint={`${stats.inCollectionCount} adet bankada`} Icon={TbBuildingBank} />
            </>
          ) : (
            <>
              <Kpi label="Ödenecek Toplam" value={fmtMulti(stats.issued)} hint={`${stats.issuedCount} adet açık`} tone="warning" Icon={TbWallet} />
              <Kpi label="Ödenen" value={`${stats.counts.PAID ?? 0} adet`} hint="Kapanmış çek / senet" tone="success" Icon={TbCircleCheck} />
            </>
          )}
          <Kpi label="Vadesi 7 Gün İçinde" value={fmtMulti(stats.dueSoon)} hint={`${stats.dueSoonCount} adet`} tone="warning" Icon={TbAlarm} />
          <Kpi
            label="Vadesi Geçmiş"
            value={fmtMulti(stats.overdue)}
            hint={`${stats.overdueCount} adet`}
            tone={stats.overdueCount ? "error" : "default"}
            Icon={TbAlertTriangle}
          />
        </div>

        {/* Durum çipleri */}
        <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {statusChips.map((c) => {
            const active = status === c.value;
            return (
              <button
                key={c.value || "all"}
                type="button"
                onClick={() => setStatus(c.value)}
                className={clsx(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition",
                  active
                    ? "bg-gray-800 text-white dark:bg-dark-50 dark:text-dark-900"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:bg-dark-700",
                )}
              >
                {c.label}
                <span
                  className={clsx(
                    "rounded-full px-1.5 text-tiny",
                    active ? "bg-white/20" : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-300",
                  )}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setStatus("");
                setSearch("");
                setDebounced("");
                setDueFrom("");
                setDueTo("");
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-600"
            >
              <TbFilterOff className="size-3.5" /> Temizle
            </button>
          )}
          <span className="ml-auto shrink-0 pl-2 text-xs text-gray-400 dark:text-dark-300">{total} kayıt</span>
        </div>

        {/* Kartlar */}
        {items.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400 dark:border-dark-600 dark:text-dark-300">
            <TbReceipt2 className="size-10 text-gray-300 dark:text-dark-500" />
            <p>{received ? "Alınan çek / senet bulunamadı." : "Verilen çek / senet bulunamadı."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((c) => (
              <ChequeCard
                key={c.id}
                cheque={c}
                canWrite={canWrite}
                onAction={(a) => setAction({ cheque: c, action: a })}
                onEndorse={() =>
                  setOp({ mode: "payment", defaults: { module: "CHEQUE", endorseChequeId: c.id, amount: Number(c.amount) } })
                }
              />
            ))}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        )}
      </div>

      <OperationModal
        open={!!op}
        mode={op?.mode ?? "collection"}
        defaults={op?.defaults}
        onClose={() => setOp(null)}
        onDone={() => {
          setOp(null);
          refresh();
        }}
      />

      <ChequeActionModal
        cheque={action?.cheque ?? null}
        action={action?.action ?? null}
        accounts={accounts}
        onClose={() => setAction(null)}
        onDone={() => {
          setAction(null);
          refresh();
        }}
      />
    </Page>
  );
}
