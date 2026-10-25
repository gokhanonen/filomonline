import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import clsx from "clsx";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  TbAlertTriangle,
  TbArrowDownLeft,
  TbArrowUpRight,
  TbCalendarTime,
  TbCar,
  TbClockExclamation,
  TbFileInvoice,
  TbHourglassLow,
  TbListDetails,
  TbRefresh,
  TbScale,
  TbUsers,
  TbWallet,
} from "react-icons/tb";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { Button, Input, Switch } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import type { AgingBucket, AgingReport, AgingRow, InvoiceSide, OpenInvoice } from "@/@types/finance";
import { getAging, listOpenInvoices } from "@/services/financeService";
import { OperationModal } from "../OperationModal";
import {
  BUCKET_COLOR,
  BUCKET_LABEL,
  FinanceNav,
  INVOICE_TYPE_LABEL,
  Kpi,
  errMsg,
  fmtDate,
  fmtMoney,
} from "../shared";

const BUCKETS: AgingBucket[] = ["NOT_DUE", "D0_30", "D31_60", "D61_90", "D90_PLUS"];
const BATCH = 24;

type View = "accounts" | "invoices";

function trNormalize(text: string | null | undefined): string {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");
}

const pct = (part: number, total: number) => (total > 0 ? Math.max(0, Math.min(100, (part / total) * 100)) : 0);

// ---------------------------------------------------------------------------
// Yaşlandırma çubuğu
// ---------------------------------------------------------------------------

function AgingBar({
  buckets,
  total,
  height = "h-3",
  showTitles = true,
}: {
  buckets: Record<AgingBucket, number>;
  total: number;
  height?: string;
  showTitles?: boolean;
}) {
  return (
    <div className={clsx("flex w-full overflow-hidden rounded-full bg-gray-150 dark:bg-dark-500", height)}>
      {total > 0 &&
        BUCKETS.map((b) =>
          buckets[b] > 0 ? (
            <div
              key={b}
              className={clsx("h-full transition-all first:rounded-l-full last:rounded-r-full", BUCKET_COLOR[b])}
              style={{ width: `${pct(buckets[b], total)}%` }}
              title={showTitles ? `${BUCKET_LABEL[b]}: ${fmtMoney(buckets[b])}` : undefined}
            />
          ) : null,
        )}
    </div>
  );
}

function AgingOverview({ report, loading }: { report: AgingReport | null; loading: boolean }) {
  const totals = report?.totals;
  const total = totals?.total ?? 0;
  return (
    <div className="rounded-2xl border border-gray-150 bg-white p-4 shadow-sm dark:border-dark-600 dark:bg-dark-700 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TbCalendarTime className="size-5 text-gray-400 dark:text-dark-300" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">Vade Yaşlandırma</h3>
        </div>
        <span className="text-xs text-gray-400 dark:text-dark-300">Açık tutarların vadeye göre dağılımı</span>
      </div>

      <div className="mt-4">
        {loading && !report ? (
          <div className="h-4 w-full animate-pulse rounded-full bg-gray-150 dark:bg-dark-500" />
        ) : (
          <AgingBar buckets={totals?.buckets ?? emptyBuckets()} total={total} height="h-4" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {BUCKETS.map((b) => {
          const v = totals?.buckets[b] ?? 0;
          return (
            <div key={b} className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-dark-800/60">
              <div className="flex items-center gap-1.5">
                <span className={clsx("size-2.5 shrink-0 rounded-full", BUCKET_COLOR[b])} />
                <span className="truncate text-xs font-medium text-gray-500 dark:text-dark-300">{BUCKET_LABEL[b]}</span>
              </div>
              <p className="mt-1 truncate text-sm font-bold text-gray-800 dark:text-dark-50">{fmtMoney(v)}</p>
              <p className="text-tiny text-gray-400 dark:text-dark-300">%{pct(v, total).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const emptyBuckets = (): Record<AgingBucket, number> => ({ NOT_DUE: 0, D0_30: 0, D31_60: 0, D61_90: 0, D90_PLUS: 0 });

// ---------------------------------------------------------------------------
// Cari kartı
// ---------------------------------------------------------------------------

function AgingAccountCard({
  row,
  side,
  canWrite,
  onOperate,
}: {
  row: AgingRow;
  side: InvoiceSide;
  canWrite: boolean;
  onOperate: () => void;
}) {
  const navigate = useNavigate();
  const receivable = side === "RECEIVABLE";
  const overduePct = pct(row.overdue, row.total);
  const notDue = row.buckets.NOT_DUE;
  const worst = [...BUCKETS].reverse().find((b) => row.buckets[b] > 0);

  return (
    <div className="group flex flex-col rounded-2xl border border-gray-150 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-dark-600 dark:bg-dark-700">
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            receivable ? "bg-success/15 text-success" : "bg-error/15 text-error",
          )}
        >
          {initials(row.accountName)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-800 dark:text-dark-50" title={row.accountName ?? undefined}>
            {row.accountName ?? "—"}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {row.overdue > 0 ? (
              <span className="inline-flex items-center gap-1 rounded bg-error/10 px-1.5 py-0.5 text-tiny font-semibold text-error">
                <TbAlertTriangle className="size-3" />
                %{overduePct.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} vadesi geçmiş
              </span>
            ) : (
              <span className="rounded bg-success/10 px-1.5 py-0.5 text-tiny font-semibold text-success">Vadesi gelmemiş</span>
            )}
            {worst && worst !== "NOT_DUE" && (
              <span className="text-tiny text-gray-400 dark:text-dark-300">en eski: {BUCKET_LABEL[worst]}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-tiny font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-300">Toplam Açık</p>
        <p className={clsx("text-xl font-bold", receivable ? "text-success" : "text-error")}>{fmtMoney(row.total)}</p>
      </div>

      <div className="mt-3">
        <AgingBar buckets={row.buckets} total={row.total} height="h-2" />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {BUCKETS.filter((b) => row.buckets[b] > 0).map((b) => (
            <span key={b} className="inline-flex items-center gap-1 text-tiny text-gray-500 dark:text-dark-300">
              <span className={clsx("size-2 rounded-full", BUCKET_COLOR[b])} />
              {BUCKET_LABEL[b]}: <span className="font-semibold text-gray-700 dark:text-dark-100">{fmtMoney(row.buckets[b])}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-error/5 px-2.5 py-1.5 dark:bg-error/10">
          <p className="text-tiny text-gray-500 dark:text-dark-300">Vadesi Geçmiş</p>
          <p className={clsx("truncate font-semibold", row.overdue > 0 ? "text-error" : "text-gray-600 dark:text-dark-200")}>
            {fmtMoney(row.overdue)}
          </p>
        </div>
        <div className="rounded-lg bg-success/5 px-2.5 py-1.5 dark:bg-success/10">
          <p className="text-tiny text-gray-500 dark:text-dark-300">Vadesi Gelmemiş</p>
          <p className="truncate font-semibold text-gray-700 dark:text-dark-100">{fmtMoney(notDue)}</p>
        </div>
      </div>

      <div className="flex-1" />
      <div className="mt-3.5 flex items-center gap-2 border-t border-gray-150 pt-3 dark:border-dark-500">
        <Button
          variant="soft"
          className="h-8 flex-1 gap-1.5 rounded-lg text-xs"
          onClick={() => navigate(`/finance/statement/${row.accountId}`)}
        >
          <TbFileInvoice className="size-4" />
          Ekstre
        </Button>
        {canWrite && (
          <Button
            color={receivable ? "success" : "error"}
            variant="soft"
            className="h-8 flex-1 gap-1.5 rounded-lg text-xs"
            onClick={onOperate}
          >
            {receivable ? <TbArrowDownLeft className="size-4" /> : <TbArrowUpRight className="size-4" />}
            {receivable ? "Tahsilat Yap" : "Ödeme Yap"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fatura kartı
// ---------------------------------------------------------------------------

function OpenInvoiceCard({ inv }: { inv: OpenInvoice }) {
  const paidPct = pct(inv.paid, inv.total);
  const overdue = inv.daysOverdue > 0;
  return (
    <div
      className={clsx(
        "flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-lg dark:bg-dark-700",
        overdue ? "border-error/30 dark:border-error/40" : "border-gray-150 dark:border-dark-600",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="rounded bg-primary-500/10 px-1.5 py-0.5 text-tiny font-semibold text-primary-600 dark:text-primary-400">
            {INVOICE_TYPE_LABEL[inv.invoiceType] ?? inv.invoiceType}
          </span>
          <p className="mt-1.5 truncate font-mono text-sm font-semibold text-gray-800 dark:text-dark-50">{inv.invoiceNo || "—"}</p>
        </div>
        <span
          className={clsx(
            "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-tiny font-bold",
            overdue ? "bg-error/15 text-error" : "bg-success/15 text-success",
          )}
        >
          {overdue ? <TbClockExclamation className="size-3.5" /> : <TbHourglassLow className="size-3.5" />}
          {overdue ? `${inv.daysOverdue} gün gecikme` : "Vadesi gelmedi"}
        </span>
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-2">
        {inv.accountName ? (
          <Link
            to={`/finance/statement/${inv.accountId}`}
            className="truncate text-sm font-medium text-gray-700 hover:text-primary-600 hover:underline dark:text-dark-100 dark:hover:text-primary-400"
            title="Cari ekstresini aç"
          >
            {inv.accountName}
          </Link>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
        {inv.vehiclePlate && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-tiny font-semibold text-gray-700 dark:border-dark-450 dark:bg-dark-800 dark:text-dark-100">
            <TbCar className="size-3" />
            {inv.vehiclePlate}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-tiny text-gray-400 dark:text-dark-300">Fatura Tarihi</p>
          <p className="font-medium text-gray-700 dark:text-dark-100">{fmtDate(inv.date)}</p>
        </div>
        <div>
          <p className="text-tiny text-gray-400 dark:text-dark-300">Vade</p>
          <p className={clsx("font-medium", overdue ? "text-error" : "text-gray-700 dark:text-dark-100")}>{fmtDate(inv.dueDate)}</p>
        </div>
      </div>

      <div className="mt-3 border-t border-gray-150 pt-3 dark:border-dark-500">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-tiny font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-300">Açık</p>
            <p className={clsx("text-lg font-bold", overdue ? "text-error" : "text-gray-800 dark:text-dark-50")}>{fmtMoney(inv.open)}</p>
          </div>
          <div className="text-right text-tiny text-gray-500 dark:text-dark-300">
            <p>
              Toplam: <span className="font-semibold text-gray-700 dark:text-dark-100">{fmtMoney(inv.total)}</span>
            </p>
            <p>
              Ödenen: <span className="font-semibold text-success">{fmtMoney(inv.paid)}</span>
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-150 dark:bg-dark-500">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${paidPct}%` }} />
          </div>
          <span className="w-9 text-right text-tiny font-semibold text-gray-500 dark:text-dark-300">
            %{paidPct.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-60 animate-pulse rounded-2xl border border-gray-150 bg-white p-4 dark:border-dark-600 dark:bg-dark-700">
          <div className="flex gap-3">
            <div className="size-11 rounded-full bg-gray-150 dark:bg-dark-500" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-gray-150 dark:bg-dark-500" />
              <div className="h-3 w-1/3 rounded bg-gray-150 dark:bg-dark-500" />
            </div>
          </div>
          <div className="mt-6 h-5 w-1/2 rounded bg-gray-150 dark:bg-dark-500" />
          <div className="mt-4 h-2 w-full rounded-full bg-gray-150 dark:bg-dark-500" />
        </div>
      ))}
    </>
  );
}

function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-dark-500 dark:bg-dark-700">
      <div className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
        <TbScale className="size-7" />
      </div>
      <p className="mt-3 font-semibold text-gray-700 dark:text-dark-100">{text}</p>
      {sub && <p className="mt-1 text-sm text-gray-400 dark:text-dark-300">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sayfa
// ---------------------------------------------------------------------------

export default function ReceivablesPage() {
  const { can } = useAuthContext();
  const canWrite = can("finance.write");
  const [searchParams, setSearchParams] = useSearchParams();

  const side: InvoiceSide = searchParams.get("side") === "PAYABLE" ? "PAYABLE" : "RECEIVABLE";
  const view: View = searchParams.get("view") === "invoices" ? "invoices" : "accounts";
  const receivable = side === "RECEIVABLE";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const [report, setReport] = useState<AgingReport | null>(null);
  const [agingLoading, setAgingLoading] = useState(true);
  const [invoices, setInvoices] = useState<OpenInvoice[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(BATCH);
  const [reloadKey, setReloadKey] = useState(0);
  const [op, setOp] = useState<{ accountId?: string } | null>(null);

  // Yaşlandırma raporu
  useEffect(() => {
    let alive = true;
    setAgingLoading(true);
    getAging(side)
      .then((r) => alive && setReport(r))
      .catch((err) => {
        if (!alive) return;
        setReport(null);
        toast.error(errMsg(err, "Yaşlandırma raporu yüklenemedi"));
      })
      .finally(() => alive && setAgingLoading(false));
    return () => {
      alive = false;
    };
  }, [side, reloadKey]);

  // Açık faturalar (yalnızca fatura görünümünde)
  useEffect(() => {
    if (view !== "invoices") return;
    let alive = true;
    setInvLoading(true);
    listOpenInvoices({ side, overdue: onlyOverdue || undefined })
      .then((r) => alive && setInvoices(r))
      .catch((err) => {
        if (!alive) return;
        setInvoices([]);
        toast.error(errMsg(err, "Açık faturalar yüklenemedi"));
      })
      .finally(() => alive && setInvLoading(false));
    return () => {
      alive = false;
    };
  }, [side, view, onlyOverdue, reloadKey]);

  // Filtre / görünüm değişince sayfalamayı sıfırla
  useEffect(() => {
    setVisible(BATCH);
  }, [side, view, search, onlyOverdue]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const filteredAccounts = useMemo(() => {
    const rows = report?.accounts ?? [];
    const q = trNormalize(search.trim());
    if (!q) return rows;
    return rows.filter((r) => trNormalize(r.accountName).includes(q));
  }, [report, search]);

  const filteredInvoices = useMemo(() => {
    const q = trNormalize(search.trim());
    if (!q) return invoices;
    return invoices.filter(
      (i) =>
        trNormalize(i.accountName).includes(q) ||
        trNormalize(i.invoiceNo).includes(q) ||
        trNormalize(i.vehiclePlate).replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }, [invoices, search]);

  const list = view === "accounts" ? filteredAccounts : filteredInvoices;
  const loadMore = useCallback(() => setVisible((v) => v + BATCH), []);

  const totals = report?.totals;
  const ninetyPlus = totals?.buckets.D90_PLUS ?? 0;
  const accountCount = report?.accounts.length ?? 0;
  const overdueAccounts = report?.accounts.filter((a) => a.overdue > 0).length ?? 0;

  const opLabel = receivable ? "Tahsilat Yap" : "Ödeme Yap";

  return (
    <Page title={receivable ? "Finans - Alacaklar" : "Finans - Borçlar"}>
      <div className="w-full space-y-4 px-(--margin-x) py-4">
        <FinanceNav
          actions={
            <>
              <Button variant="flat" isIcon className="size-8 rounded-lg" onClick={reload} title="Yenile" aria-label="Yenile">
                <TbRefresh className={clsx("size-4", (agingLoading || invLoading) && "animate-spin")} />
              </Button>
              {canWrite && (
                <Button
                  color={receivable ? "success" : "error"}
                  className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
                  onClick={() => setOp({})}
                >
                  {receivable ? <TbArrowDownLeft className="size-4" /> : <TbArrowUpRight className="size-4" />}
                  {opLabel}
                </Button>
              )}
            </>
          }
        />

        {/* Alacak / Borç geçişi */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-dark-600 dark:bg-dark-800 sm:w-auto">
            {(["RECEIVABLE", "PAYABLE"] as InvoiceSide[]).map((s) => {
              const active = s === side;
              const isRec = s === "RECEIVABLE";
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setParam("side", isRec ? null : "PAYABLE")}
                  className={clsx(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none",
                    active
                      ? isRec
                        ? "bg-white text-success shadow-sm dark:bg-dark-600"
                        : "bg-white text-error shadow-sm dark:bg-dark-600"
                      : "text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100",
                  )}
                >
                  {isRec ? <TbArrowDownLeft className="size-4" /> : <TbArrowUpRight className="size-4" />}
                  {isRec ? "Alacaklar" : "Borçlar"}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 dark:text-dark-300">
            {receivable
              ? "Satış / kira faturaları ve verilen hizmet masrafları (120 Alıcılar)"
              : "Alış faturaları ve alınan masraflar (320 Satıcılar / 329 Diğer Ticari Borçlar)"}
          </p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Toplam Açık"
            value={fmtMoney(totals?.total)}
            hint={`${accountCount} cari`}
            tone={receivable ? "success" : "error"}
            Icon={TbWallet}
          />
          <Kpi
            label="Vadesi Geçmiş"
            value={fmtMoney(totals?.overdue)}
            hint={`${overdueAccounts} cari · %${pct(totals?.overdue ?? 0, totals?.total ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`}
            tone={(totals?.overdue ?? 0) > 0 ? "error" : "default"}
            Icon={TbAlertTriangle}
          />
          <Kpi
            label="Vadesi Gelmemiş"
            value={fmtMoney(totals?.buckets.NOT_DUE)}
            hint="Henüz vadesi dolmayan"
            tone="info"
            Icon={TbHourglassLow}
          />
          <Kpi
            label="90+ Gün"
            value={fmtMoney(ninetyPlus)}
            hint="Riskli / takip gerektiren"
            tone={ninetyPlus > 0 ? "warning" : "default"}
            Icon={TbClockExclamation}
          />
        </div>

        <AgingOverview report={report} loading={agingLoading} />

        {/* Görünüm sekmeleri + filtreler */}
        <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 border-b border-gray-200 dark:border-dark-600">
            {(
              [
                { id: "accounts", label: "Cari Bazında", Icon: TbUsers, count: filteredAccounts.length },
                { id: "invoices", label: "Fatura Bazında", Icon: TbListDetails, count: view === "invoices" ? filteredInvoices.length : null },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setParam("view", t.id === "accounts" ? null : "invoices")}
                className={clsx(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition",
                  view === t.id
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100",
                )}
              >
                <t.Icon className="size-4" />
                {t.label}
                {t.count !== null && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-tiny font-medium text-gray-600 dark:bg-dark-700 dark:text-dark-300">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {view === "invoices" && (
              <Switch
                label="Sadece vadesi geçenler"
                color="error"
                checked={onlyOverdue}
                onChange={(e) => setOnlyOverdue(e.target.checked)}
                classNames={{ labelText: "text-sm text-gray-600 dark:text-dark-200" }}
              />
            )}
            <Input
              placeholder={view === "accounts" ? "Cari adı ara..." : "Cari, fatura no, plaka ara..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4" />}
              className="w-full sm:w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {view === "accounts" ? (
            agingLoading && !report ? (
              <SkeletonCards />
            ) : filteredAccounts.length === 0 ? (
              <EmptyState
                text={search ? "Aramaya uygun cari bulunamadı." : receivable ? "Açık alacak bulunmuyor." : "Açık borç bulunmuyor."}
                sub={search ? undefined : "Tüm faturalar kapatılmış görünüyor."}
              />
            ) : (
              filteredAccounts
                .slice(0, visible)
                .map((row) => (
                  <AgingAccountCard
                    key={row.accountId}
                    row={row}
                    side={side}
                    canWrite={canWrite}
                    onOperate={() => setOp({ accountId: row.accountId })}
                  />
                ))
            )
          ) : invLoading && invoices.length === 0 ? (
            <SkeletonCards />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              text={search ? "Aramaya uygun fatura bulunamadı." : onlyOverdue ? "Vadesi geçmiş açık fatura yok." : "Açık fatura bulunmuyor."}
            />
          ) : (
            filteredInvoices.slice(0, visible).map((inv) => <OpenInvoiceCard key={`${inv.invoiceType}:${inv.invoiceId}`} inv={inv} />)
          )}
          <InfiniteSentinel onReach={loadMore} hasMore={visible < list.length} loading={false} />
        </div>
      </div>

      <OperationModal
        open={op !== null}
        onClose={() => setOp(null)}
        onDone={() => {
          setOp(null);
          reload();
        }}
        mode={receivable ? "collection" : "payment"}
        defaults={op?.accountId ? { accountId: op.accountId } : undefined}
      />
    </Page>
  );
}
