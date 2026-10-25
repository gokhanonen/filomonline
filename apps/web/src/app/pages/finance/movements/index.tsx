import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import clsx from "clsx";
import { toast } from "sonner";
import {
  TbArrowDownLeft,
  TbArrowRight,
  TbArrowUpRight,
  TbArrowsExchange,
  TbChevronDown,
  TbFileInvoice,
  TbLayoutList,
  TbPencil,
  TbReceipt,
  TbSearch,
  TbShoppingCart,
  TbTrash,
  TbX,
} from "react-icons/tb";

import { Page } from "@/components/shared/Page";
import { Modal } from "@/components/shared/Modal";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button, Input } from "@/components/ui";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import type { LedgerRow, LedgerTotals, LedgerView } from "@/@types/finance";
import { INTEGRATION_LABELS, type IntegrationStatus, type InvoiceType } from "@/@types/invoice";
import type { Expense } from "@/@types/expense";
import { deleteMovementGroup, getLedger } from "@/services/financeService";
import { deleteInvoice, updateInvoiceStatus } from "@/services/invoiceService";
import { deleteExpense, getExpense } from "@/services/expenseService";
import { InvoiceForm } from "@/app/pages/invoices/InvoiceForm";
import { ExpenseForm } from "@/app/pages/expenses/ExpenseForm";
import { FinanceActions } from "../FinanceActions";
import { OperationModal, type OperationMode } from "../OperationModal";
import {
  ACCOUNT_TYPE_META,
  FinanceNav,
  MOVEMENT_TYPE_LABEL,
  errMsg,
  fmtDate,
  fmtMoney,
  useAccountOptions,
  useFinanceAccounts,
} from "../shared";
import { DateRangeInput } from "./DateRangeInput";

const PAGE_SIZE = 30;

const VIEWS: { id: LedgerView; label: string; Icon: React.ElementType }[] = [
  { id: "ALL", label: "Tümü", Icon: TbLayoutList },
  { id: "IN", label: "Giriş", Icon: TbArrowDownLeft },
  { id: "OUT", label: "Çıkış", Icon: TbArrowUpRight },
  { id: "TRANSFER", label: "Transfer", Icon: TbArrowsExchange },
  { id: "SALES", label: "Satış Faturası", Icon: TbFileInvoice },
  { id: "PURCHASE", label: "Alış Faturası", Icon: TbShoppingCart },
  { id: "EXPENSE", label: "Masraf", Icon: TbReceipt },
];

const KIND_LABEL = { SALES: "Satış Faturası", RENTAL: "Kira Faturası", PURCHASE: "Alış Faturası", EXPENSE: "Masraf" } as const;
const INVOICE_TYPE: Partial<Record<LedgerRow["kind"], InvoiceType>> = { SALES: "sales", RENTAL: "rental", PURCHASE: "purchase" };
const NEXT_STATUS: Partial<Record<IntegrationStatus, IntegrationStatus>> = { BEKLIYOR: "KUYRUKTA", KUYRUKTA: "ENTEGRE_EDILDI" };

function rowVisual(r: LedgerRow): { Icon: React.ElementType; tone: string } {
  if (r.kind === "SALES" || r.kind === "RENTAL") return { Icon: TbFileInvoice, tone: "bg-primary-500/10 text-primary-600 dark:text-primary-400" };
  if (r.kind === "PURCHASE") return { Icon: TbShoppingCart, tone: "bg-secondary/10 text-secondary" };
  if (r.kind === "EXPENSE") return { Icon: TbReceipt, tone: "bg-warning/10 text-warning" };
  const module = r.legs?.[0]?.module ?? "CASH";
  const { Icon } = ACCOUNT_TYPE_META[module];
  const tone = r.flow === "IN" ? "bg-success/10 text-success" : r.flow === "OUT" ? "bg-error/10 text-error" : "bg-info/10 text-info";
  return { Icon, tone };
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Bugün";
  if (same(d, y)) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long", ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });
}

/** Hareketin kısa güzergâhı: "Garanti → Kasa", "Çek #A-1 · Garanti POS" */
function route(r: LedgerRow) {
  if (!r.legs?.length) return null;
  const out = r.legs.filter((l) => l.direction === "OUT").map((l) => l.name);
  const inn = r.legs.filter((l) => l.direction === "IN").map((l) => l.name);
  if (r.flow === "TRANSFER" && out.length && inn.length) return `${[...new Set(out)].join(", ")} → ${[...new Set(inn)].join(", ")}`;
  return [...new Set(r.legs.map((l) => l.name))].join(" · ");
}

export default function FinanceMovementsPage() {
  const { can } = useAuthContext();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<LedgerView>((params.get("view") as LedgerView) || "ALL");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [debounced, setDebounced] = useState(search);
  const [accountId, setAccountId] = useState(params.get("accountId") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const cashRegisterId = params.get("cashRegisterId") ?? "";
  const chequeId = params.get("chequeId") ?? "";
  const [refreshKey, setRefreshKey] = useState(0);
  const [totals, setTotals] = useState<LedgerTotals | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // modallar
  const [op, setOp] = useState<{ mode: OperationMode; accountId?: string } | null>(null);
  const [editInvoice, setEditInvoice] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [confirmDel, setConfirmDel] = useState<LedgerRow | null>(null);

  const { options: accountOptions } = useAccountOptions();
  const { accounts: finAccounts } = useFinanceAccounts();
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Filtreleri URL'de tut (paylaşılabilir / derin link)
  useEffect(() => {
    const next = new URLSearchParams();
    if (view !== "ALL") next.set("view", view);
    if (debounced) next.set("search", debounced);
    if (accountId) next.set("accountId", accountId);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    if (cashRegisterId) next.set("cashRegisterId", cashRegisterId);
    if (chequeId) next.set("chequeId", chequeId);
    setParams(next, { replace: true });
  }, [view, debounced, accountId, from, to, cashRegisterId, chequeId, setParams]);

  const fetchPage = useCallback(
    async (page: number) => {
      void refreshKey;
      const res = await getLedger({
        page,
        pageSize: PAGE_SIZE,
        view,
        search: debounced || undefined,
        accountId: accountId || undefined,
        cashRegisterId: cashRegisterId || undefined,
        chequeId: chequeId || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      if (page === 1) setTotals(res.totals);
      return res;
    },
    [view, debounced, accountId, cashRegisterId, chequeId, from, to, refreshKey],
  );
  const { items, total, loading, hasMore, loadMore } = useInfiniteList<LedgerRow>(fetchPage);

  const days = useMemo(() => {
    const map = new Map<string, LedgerRow[]>();
    for (const r of items) {
      const k = r.date.slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()];
  }, [items]);

  const clearDeepLink = (key: "cashRegisterId" | "chequeId") => {
    const next = new URLSearchParams(params);
    next.delete(key);
    setParams(next, { replace: true });
  };
  const regName = finAccounts.find((a) => a.id === cashRegisterId)?.name;

  // ---- Satır işlemleri ----

  const doDelete = async () => {
    const r = confirmDel;
    if (!r) return;
    try {
      if (r.kind === "MOVEMENT") await deleteMovementGroup(r.groupId!);
      else if (r.kind === "EXPENSE") await deleteExpense(r.recordId!);
      else await deleteInvoice(INVOICE_TYPE[r.kind]!, r.recordId!);
      toast.success("Silindi");
      setConfirmDel(null);
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const advance = async (r: LedgerRow) => {
    const next = r.integrationStatus ? NEXT_STATUS[r.integrationStatus as IntegrationStatus] : undefined;
    if (!next) return;
    try {
      await updateInvoiceStatus(INVOICE_TYPE[r.kind]!, r.recordId!, next);
      toast.success(`Entegrasyon: ${INTEGRATION_LABELS[next]}`);
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const openEdit = async (r: LedgerRow) => {
    if (r.kind === "EXPENSE") {
      try {
        setEditExpense(await getExpense(r.recordId!));
      } catch (err) {
        toast.error(errMsg(err));
      }
    } else if (r.kind === "SALES") setEditInvoice(r.recordId!);
  };

  const canDeleteRow = (r: LedgerRow) =>
    r.kind === "MOVEMENT"
      ? can("finance.delete")
      : r.kind === "EXPENSE"
        ? can("expenses.delete")
        : can("invoices.delete") && r.integrationStatus !== "ENTEGRE_EDILDI";

  return (
    <Page title="Finans - Hareketler">
      <div className="w-full space-y-4 px-(--margin-x) py-4">
        <FinanceNav actions={<FinanceActions onDone={refresh} />} />

        {/* Toplamlar */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Total label="Nakit Giriş" value={fmtMoney(totals?.cashIn)} tone="text-success" />
          <Total label="Nakit Çıkış" value={fmtMoney(totals?.cashOut)} tone="text-error" />
          <Total label="Net Nakit" value={fmtMoney((totals?.cashIn ?? 0) - (totals?.cashOut ?? 0))} />
          <Total label="Satış Faturaları" value={fmtMoney(totals?.sales)} />
          <Total label="Alış + Masraf" value={fmtMoney((totals?.purchases ?? 0) + (totals?.expenses ?? 0))} />
        </div>

        {/* Görünüm sekmeleri */}
        <div className="hide-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                view === id ? "bg-white text-gray-800 shadow-sm dark:bg-dark-600 dark:text-dark-50" : "text-gray-500 hover:text-gray-700 dark:text-dark-300",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {/* Filtreler */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
          <Input
            placeholder="Cari, belge no, açıklama, hesap…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<TbSearch className="size-4" />}
            className="lg:w-72"
          />
          <div className="lg:w-72">
            <SearchableSelect placeholder="Tüm cariler" options={accountOptions} value={accountId} onChange={setAccountId} onClear={() => setAccountId("")} />
          </div>
          <DateRangeInput label="Tarih" from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          {(cashRegisterId || chequeId) && (
            <div className="flex flex-wrap gap-1.5">
              {cashRegisterId && <Chip onClear={() => clearDeepLink("cashRegisterId")}>{regName ?? "Hesap"}</Chip>}
              {chequeId && <Chip onClear={() => clearDeepLink("chequeId")}>Çek hareketleri</Chip>}
            </div>
          )}
          <span className="text-xs text-gray-400 lg:ml-auto">{total} kayıt</span>
        </div>

        {/* Akış */}
        {items.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400 dark:border-dark-600">Kayıt bulunamadı.</div>
        ) : (
          <div className="space-y-5">
            {days.map(([day, rows]) => {
              const net = rows.reduce((s, r) => s + (r.flow === "IN" ? r.amount : r.flow === "OUT" ? -r.amount : 0), 0);
              return (
                <section key={day}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h4 className="text-sm font-semibold capitalize text-gray-700 dark:text-dark-100">{dayLabel(day)}</h4>
                    {net !== 0 && (
                      <span className={clsx("text-xs font-semibold", net > 0 ? "text-success" : "text-error")}>
                        {net > 0 ? "+" : "−"}
                        {fmtMoney(Math.abs(net))}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm dark:divide-dark-600 dark:border-dark-600 dark:bg-dark-700">
                    {rows.map((r) => (
                      <Row
                        key={r.key}
                        r={r}
                        open={expanded === r.key}
                        onToggle={() => setExpanded(expanded === r.key ? null : r.key)}
                        onPay={
                          r.kind !== "MOVEMENT" && (r.open ?? 0) > 0.009 && r.accountId && can("finance.write")
                            ? () => setOp({ mode: r.flow === "RECEIVABLE" ? "collection" : "payment", accountId: r.accountId! })
                            : undefined
                        }
                        onEdit={
                          (r.kind === "SALES" && can("invoices.write")) || (r.kind === "EXPENSE" && can("expenses.write")) ? () => openEdit(r) : undefined
                        }
                        onAdvance={
                          r.kind !== "MOVEMENT" && r.kind !== "EXPENSE" && can("invoices.write") && r.integrationStatus && NEXT_STATUS[r.integrationStatus as IntegrationStatus]
                            ? () => advance(r)
                            : undefined
                        }
                        onDelete={canDeleteRow(r) ? () => setConfirmDel(r) : undefined}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        )}
      </div>

      {op && <OperationModal open onClose={() => setOp(null)} onDone={refresh} mode={op.mode} defaults={{ accountId: op.accountId }} />}
      <InvoiceForm open={Boolean(editInvoice)} onClose={() => setEditInvoice(null)} onSaved={refresh} initialType="sales" editingInvoiceId={editInvoice ?? undefined} />
      <ExpenseForm open={Boolean(editExpense)} onClose={() => setEditExpense(null)} onSaved={refresh} expense={editExpense} />
      <Modal open={Boolean(confirmDel)} onClose={() => setConfirmDel(null)} title="Kayıt silinsin mi?" className="max-w-md">
        <p className="text-sm text-gray-600 dark:text-dark-200">
          {confirmDel?.kind === "MOVEMENT"
            ? `${MOVEMENT_TYPE_LABEL[confirmDel.movementType!]} işlemi${(confirmDel.legs?.length ?? 0) > 1 ? ` (${confirmDel.legs!.length} bacak)` : ""} ve fatura eşleştirmeleri silinecek.`
            : `${confirmDel ? KIND_LABEL[confirmDel.kind as keyof typeof KIND_LABEL] : ""} ${confirmDel?.documentNo ?? ""} silinecek.`}{" "}
          Bu işlem geri alınamaz.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="flat" onClick={() => setConfirmDel(null)}>Vazgeç</Button>
          <Button color="error" onClick={doDelete}>Sil</Button>
        </div>
      </Modal>
    </Page>
  );
}

// ---------------------------------------------------------------------------

function Row({
  r,
  open,
  onToggle,
  onPay,
  onEdit,
  onAdvance,
  onDelete,
}: {
  r: LedgerRow;
  open: boolean;
  onToggle: () => void;
  onPay?: () => void;
  onEdit?: () => void;
  onAdvance?: () => void;
  onDelete?: () => void;
}) {
  const { Icon, tone } = rowVisual(r);
  const isDoc = r.kind !== "MOVEMENT";
  const typeLabel = isDoc ? KIND_LABEL[r.kind as keyof typeof KIND_LABEL] : MOVEMENT_TYPE_LABEL[r.movementType!];
  const title = r.accountName || r.description || typeLabel;
  const overdue = isDoc && (r.open ?? 0) > 0.009 && r.dueDate && new Date(r.dueDate) < new Date(new Date().toDateString());
  const sign = r.flow === "IN" ? "+" : r.flow === "OUT" ? "−" : "";
  const amountTone = r.flow === "IN" ? "text-success" : r.flow === "OUT" ? "text-error" : "text-gray-800 dark:text-dark-50";

  return (
    <div>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-dark-600/50">
        <span className={clsx("flex size-10 shrink-0 items-center justify-center rounded-xl", tone)}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-gray-800 dark:text-dark-50">{title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-dark-300">
            <span className="font-medium">{typeLabel}</span>
            {route(r) && <span className="truncate">{route(r)}</span>}
            {r.documentNo && <span>#{r.documentNo}</span>}
            {r.vehiclePlate && <span className="rounded bg-gray-100 px-1.5 font-semibold text-gray-600 dark:bg-dark-600 dark:text-dark-200">{r.vehiclePlate}</span>}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={clsx("block font-bold tabular-nums", amountTone)}>
            {sign}
            {fmtMoney(r.amount)}
          </span>
          {r.foreignAmount !== null && <span className="block text-xs text-gray-400">{fmtMoney(r.foreignAmount, r.currency)}</span>}
          {isDoc && r.open !== undefined && (
            <span
              className={clsx(
                "mt-0.5 inline-block rounded px-1.5 py-0.5 text-tiny font-semibold",
                r.open <= 0.009 ? "bg-success/15 text-success" : overdue ? "bg-error/15 text-error" : r.paid ? "bg-warning/15 text-warning" : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-200",
              )}
            >
              {r.open <= 0.009 ? (r.flow === "RECEIVABLE" ? "Tahsil edildi" : "Ödendi") : r.paid ? `Açık ${fmtMoney(r.open)}` : overdue ? "Vadesi geçti" : `Vade ${fmtDate(r.dueDate)}`}
            </span>
          )}
        </span>
        <TbChevronDown className={clsx("size-4 shrink-0 text-gray-300 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 bg-gray-50/70 px-4 pb-4 pt-3 text-sm dark:bg-dark-800/40 sm:pl-17">
          {r.legs && r.legs.length > 0 && (
            <div className="space-y-1">
              {r.legs.map((l, i) => {
                const meta = ACCOUNT_TYPE_META[l.module];
                return (
                  <div key={i} className="flex items-center justify-between gap-2 text-gray-600 dark:text-dark-200">
                    <span className="flex items-center gap-2">
                      <meta.Icon className="size-4 text-gray-400" />
                      {l.name}
                    </span>
                    <span className={clsx("font-semibold tabular-nums", l.direction === "IN" ? "text-success" : "text-error")}>
                      {l.direction === "IN" ? "+" : "−"}
                      {fmtMoney(l.amount, l.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-dark-300 sm:grid-cols-2">
            <span>Tarih: {fmtDate(r.date)}</span>
            {isDoc && r.dueDate && <span>Vade: {fmtDate(r.dueDate)}</span>}
            {isDoc && r.total !== undefined && (
              <span>
                Toplam {fmtMoney(r.total)} · {r.flow === "RECEIVABLE" ? "Tahsil" : "Ödenen"} {fmtMoney(r.paid)}
              </span>
            )}
            {r.integrationStatus && <span>Entegrasyon: {INTEGRATION_LABELS[r.integrationStatus as IntegrationStatus] ?? r.integrationStatus}</span>}
            {r.cheque && <span>Çek durumu: vade {fmtDate(r.cheque.dueDate)}</span>}
            {r.description && r.accountName && <span className="sm:col-span-2">Açıklama: {r.description}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {onPay && (
              <Button color="primary" className="h-8 gap-1 px-3 text-xs" onClick={onPay}>
                {r.flow === "RECEIVABLE" ? "Tahsilat Al" : "Ödeme Yap"} <TbArrowRight className="size-3.5" />
              </Button>
            )}
            {onAdvance && (
              <Button variant="soft" color="info" className="h-8 px-3 text-xs" onClick={onAdvance}>
                Entegrasyonu ilerlet
              </Button>
            )}
            {onEdit && (
              <Button variant="flat" className="h-8 gap-1 px-3 text-xs" onClick={onEdit}>
                <TbPencil className="size-3.5" /> Düzenle
              </Button>
            )}
            {r.accountId && (
              <Link to={`/finance/statement/${r.accountId}`} className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-600">
                Cari ekstre
              </Link>
            )}
            {r.cheque && (
              <Link to="/finance/cheques" className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-600">
                Çek portföyü
              </Link>
            )}
            {onDelete && (
              <Button variant="flat" color="error" className="ml-auto h-8 gap-1 px-3 text-xs" onClick={onDelete}>
                <TbTrash className="size-3.5" /> Sil
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-gray-150 bg-white px-4 py-3 shadow-sm dark:border-dark-600 dark:bg-dark-700">
      <p className="text-tiny font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={clsx("mt-1 truncate text-lg font-bold tabular-nums text-gray-800 dark:text-dark-50", tone)}>{value}</p>
    </div>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 py-1 pl-3 pr-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300">
      {children}
      <button type="button" onClick={onClear} className="rounded-full p-0.5 hover:bg-primary-500/20" aria-label="Filtreyi kaldır">
        <TbX className="size-3.5" />
      </button>
    </span>
  );
}
