import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import clsx from "clsx";
import { toast } from "sonner";
import {
  TbArrowDownLeft,
  TbArrowUpRight,
  TbArrowsExchange,
  TbCalendarDue,
  TbCopy,
  TbListDetails,
  TbPencil,
  TbPlus,
  TbReceipt2,
  TbScale,
  TbTransferIn,
  TbTrash,
  TbTrendingDown,
  TbTrendingUp,
} from "react-icons/tb";

import { Page } from "@/components/shared/Page";
import { Button } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { useAuthContext } from "@/app/contexts/auth/context";
import type { FinanceAccount, FinanceAccountType, FinanceSummary } from "@/@types/finance";
import { deleteFinanceAccount, getFinanceSummary } from "@/services/financeService";
import {
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPE_META,
  FinanceNav,
  Kpi,
  errMsg,
  fmtDate,
  fmtMoney,
  useFinanceAccounts,
} from "../shared";
import { OperationModal, type OperationDefaults, type OperationMode } from "../OperationModal";
import { FinanceAccountModal } from "./FinanceAccountModal";
import { PosSettlementModal } from "./PosSettlementModal";

const SECTIONS: { type: FinanceAccountType; title: string }[] = [
  { type: "CASH", title: "Kasalar" },
  { type: "BANK", title: "Banka Hesapları" },
  { type: "POS", title: "POS Cihazları" },
  { type: "CREDIT_CARD", title: "Şirket Kredi Kartları" },
];

const sumTry = (m?: Partial<Record<string, number>>) => m?.TRY ?? 0;
const foreign = (m?: Partial<Record<string, number>>) =>
  Object.entries(m ?? {})
    .filter(([c, v]) => c !== "TRY" && v)
    .map(([c, v]) => fmtMoney(v, c))
    .join(" · ");

export default function FinanceAccountsPage() {
  const { can } = useAuthContext();
  const canWrite = can("finance.write");
  const canDelete = can("finance.delete");
  const [params, setParams] = useSearchParams();

  const { accounts, loading, reload } = useFinanceAccounts();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [op, setOp] = useState<{ mode: OperationMode; defaults?: OperationDefaults } | null>(null);
  const [editing, setEditing] = useState<{ account: FinanceAccount | null; type?: FinanceAccountType } | null>(null);
  const [posTarget, setPosTarget] = useState<FinanceAccount | null>(null);
  const [deleting, setDeleting] = useState<FinanceAccount | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const loadSummary = () => getFinanceSummary().then(setSummary).catch(() => void 0);
  const refresh = () => {
    void reload();
    void loadSummary();
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  // Sekme menüsünden gelen ?op=transfer
  useEffect(() => {
    const q = params.get("op");
    if (q === "transfer" || q === "collection" || q === "payment") {
      setOp({ mode: q });
      params.delete("op");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const grouped = useMemo(() => {
    const visible = accounts.filter((a) => showInactive || a.isActive);
    return SECTIONS.map((s) => ({ ...s, items: visible.filter((a) => a.type === s.type) }));
  }, [accounts, showInactive]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteFinanceAccount(deleting.id);
      toast.success("Hesap silindi");
      setDeleting(null);
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
      setDeleting(null);
    }
  };

  const b = summary?.balances;

  return (
    <Page title="Finans - Kasa & Banka">
      <div className="w-full space-y-5 px-(--margin-x) py-4">
        <FinanceNav
          actions={
            canWrite && (
              <>
                <Button color="success" className="h-9 gap-1.5 px-3 text-sm" onClick={() => setOp({ mode: "collection" })}>
                  <TbArrowDownLeft className="size-4.5" /> Tahsilat
                </Button>
                <Button color="error" className="h-9 gap-1.5 px-3 text-sm" onClick={() => setOp({ mode: "payment" })}>
                  <TbArrowUpRight className="size-4.5" /> Ödeme
                </Button>
                <Button color="info" className="h-9 gap-1.5 px-3 text-sm" onClick={() => setOp({ mode: "transfer" })}>
                  <TbArrowsExchange className="size-4.5" /> Virman
                </Button>
                <Button
                  color="primary"
                  isIcon
                  className="size-9 shrink-0 rounded-lg shadow-xs"
                  title="Yeni Hesap"
                  aria-label="Yeni Hesap"
                  onClick={() => setEditing({ account: null })}
                >
                  <TbPlus className="size-5" />
                </Button>
              </>
            )
          }
        />

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
          <Kpi label="Kasa" value={fmtMoney(sumTry(b?.CASH))} hint={foreign(b?.CASH) || "Nakit"} Icon={ACCOUNT_TYPE_META.CASH.Icon} />
          <Kpi label="Banka" value={fmtMoney(sumTry(b?.BANK))} hint={foreign(b?.BANK) || "Vadesiz"} Icon={ACCOUNT_TYPE_META.BANK.Icon} />
          <Kpi label="POS Bekleyen" value={fmtMoney(summary?.posPending)} hint="Valör bekleyen" tone="info" Icon={ACCOUNT_TYPE_META.POS.Icon} />
          <Kpi label="Kart Borcu" value={fmtMoney(summary?.cardDebt)} hint="Şirket kartları" tone={summary?.cardDebt ? "error" : "default"} Icon={ACCOUNT_TYPE_META.CREDIT_CARD.Icon} />
          <Kpi label="Bu Ay Giriş" value={fmtMoney(summary?.monthCollection)} tone="success" Icon={TbTrendingUp} />
          <Kpi label="Bu Ay Çıkış" value={fmtMoney(summary?.monthPayment)} tone="error" Icon={TbTrendingDown} />
          <Link to="/finance/cheques" className="block">
            <Kpi
              label="Portföy Çek"
              value={fmtMoney(sumTry(summary?.chequesReceived.byCurrency))}
              hint={`${summary?.chequesReceived.count ?? 0} adet${foreign(summary?.chequesReceived.byCurrency) ? ` · ${foreign(summary?.chequesReceived.byCurrency)}` : ""}`}
              Icon={TbReceipt2}
            />
          </Link>
          <Link to="/finance/receivables" className="block">
            <Kpi
              label="Vadesi Geçen Alacak"
              value={fmtMoney(summary?.receivable.overdue)}
              hint={`Toplam açık ${fmtMoney(summary?.receivable.total)}`}
              tone={summary?.receivable.overdue ? "warning" : "default"}
              Icon={TbScale}
            />
          </Link>
        </div>

        {loading && accounts.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Yükleniyor...</div>
        ) : (
          grouped.map((s) => (
            <section key={s.type} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">{s.title}</h3>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-dark-700 dark:text-dark-300">{s.items.length}</span>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setEditing({ account: null, type: s.type })}
                    className="ml-1 flex size-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-primary-500 hover:text-white dark:bg-dark-700"
                    title={`Yeni ${ACCOUNT_TYPE_LABEL[s.type]}`}
                  >
                    <TbPlus className="size-3.5" />
                  </button>
                )}
              </div>
              {s.items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400 dark:border-dark-600">
                  Henüz {ACCOUNT_TYPE_LABEL[s.type].toLocaleLowerCase("tr-TR")} tanımlanmadı.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {s.items.map((a) => (
                    <FinanceAccountCard
                      key={a.id}
                      account={a}
                      canWrite={canWrite}
                      onCollect={() => setOp({ mode: "collection", defaults: { module: a.type, cashRegisterId: a.id } })}
                      onPay={() => setOp({ mode: "payment", defaults: { module: a.type, cashRegisterId: a.id } })}
                      onTransfer={() =>
                        setOp({
                          mode: "transfer",
                          defaults: a.type === "CREDIT_CARD" ? { toId: a.id, fromId: a.linkedBankId ?? undefined } : { fromId: a.id },
                        })
                      }
                      onSettle={() => setPosTarget(a)}
                      onEdit={() => setEditing({ account: a })}
                      onDelete={canDelete ? () => setDeleting(a) : undefined}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}

        {accounts.some((a) => !a.isActive) && (
          <button type="button" onClick={() => setShowInactive((v) => !v)} className="text-xs font-semibold text-gray-500 hover:text-primary-600">
            {showInactive ? "Pasif hesapları gizle" : `Pasif hesapları göster (${accounts.filter((a) => !a.isActive).length})`}
          </button>
        )}
      </div>

      {op && <OperationModal open onClose={() => setOp(null)} onDone={refresh} mode={op.mode} defaults={op.defaults} />}
      <FinanceAccountModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSaved={refresh}
        account={editing?.account ?? null}
        defaultType={editing?.type}
        accounts={accounts}
      />
      <PosSettlementModal open={Boolean(posTarget)} onClose={() => setPosTarget(null)} onDone={refresh} pos={posTarget} accounts={accounts} />
      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Hesap silinsin mi?" className="max-w-md">
        <p className="text-sm text-gray-600 dark:text-dark-200">
          "{deleting?.name}" silinecek. Hareketi, bağlı POS/kartı ya da çeki olan hesaplar silinemez; pasife alabilirsiniz.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="flat" onClick={() => setDeleting(null)}>
            Vazgeç
          </Button>
          <Button color="error" onClick={handleDelete}>
            Sil
          </Button>
        </div>
      </Modal>
    </Page>
  );
}

// ---------------------------------------------------------------------------

interface CardProps {
  account: FinanceAccount;
  canWrite: boolean;
  onCollect: () => void;
  onPay: () => void;
  onTransfer: () => void;
  onSettle: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

function FinanceAccountCard({ account: a, canWrite, onCollect, onPay, onTransfer, onSettle, onEdit, onDelete }: CardProps) {
  const { Icon, gradient } = ACCOUNT_TYPE_META[a.type];
  const isCard = a.type === "CREDIT_CARD";
  const isPos = a.type === "POS";
  const usedPct = isCard && a.creditLimit ? Math.min(100, ((a.cardDebt ?? 0) / a.creditLimit) * 100) : 0;

  const copyIban = () => {
    if (!a.iban) return;
    void navigator.clipboard.writeText(a.iban.replace(/\s/g, ""));
    toast.success("IBAN kopyalandı");
  };

  return (
    <div className={clsx("group flex flex-col overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm transition hover:shadow-lg dark:border-dark-600 dark:bg-dark-700", !a.isActive && "opacity-60")}>
      {/* Başlık — banka kartı görünümü */}
      <div className={clsx("relative bg-linear-to-br p-4 text-white", gradient)}>
        <div className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 right-10 size-24 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-tiny font-semibold uppercase tracking-wider text-white/70">
              {ACCOUNT_TYPE_LABEL[a.type]}
              {a.bankName ? ` · ${a.bankName}` : ""}
            </p>
            <h4 className="mt-0.5 truncate text-base font-bold">{a.name}</h4>
          </div>
          <div className="flex items-center gap-1.5">
            {a.currency !== "TRY" && <span className="rounded bg-white/20 px-1.5 py-0.5 text-tiny font-bold">{a.currency}</span>}
            {!a.isActive && <span className="rounded bg-black/20 px-1.5 py-0.5 text-tiny font-bold">Pasif</span>}
            <Icon className="size-7 text-white/90" />
          </div>
        </div>

        <div className="relative mt-4">
          <p className="text-tiny uppercase text-white/70">{isCard ? "Güncel Borç" : isPos ? "Valör Bekleyen" : "Bakiye"}</p>
          <p className="text-2xl font-bold tracking-tight">
            {fmtMoney(isCard ? a.cardDebt : isPos ? a.pendingPos : a.balance, a.currency)}
          </p>
        </div>

        {isCard && (
          <p className="relative mt-2 font-mono text-sm tracking-[0.2em] text-white/85">•••• •••• •••• {a.cardLastFour || "····"}</p>
        )}
        {a.type === "BANK" && a.iban && (
          <button type="button" onClick={copyIban} className="relative mt-2 flex items-center gap-1 font-mono text-xs text-white/85 hover:text-white">
            {a.iban} <TbCopy className="size-3.5" />
          </button>
        )}
      </div>

      {/* Gövde */}
      <div className="flex flex-1 flex-col gap-2 p-4 text-sm">
        {isCard ? (
          <>
            {a.creditLimit !== null && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-dark-300">
                  <span>Limit kullanımı</span>
                  <span>Kalan {fmtMoney(a.availableLimit, a.currency)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
                  <div className={clsx("h-full rounded-full", usedPct > 80 ? "bg-error" : usedPct > 50 ? "bg-warning" : "bg-success")} style={{ width: `${usedPct}%` }} />
                </div>
              </div>
            )}
            {a.period && (
              <div className="flex items-center justify-between text-gray-600 dark:text-dark-200">
                <span className="flex items-center gap-1.5">
                  <TbCalendarDue className="size-4 text-gray-400" /> Dönem ({fmtDate(a.period.start)}–{fmtDate(a.period.end)})
                </span>
                <span className="font-semibold">{fmtMoney(a.period.spend, a.currency)}</span>
              </div>
            )}
            {a.period?.dueDate && (
              <p className="text-xs text-gray-400">
                Son ödeme {fmtDate(a.period.dueDate)} · Ödeme hesabı {a.linkedBank?.name ?? "—"}
              </p>
            )}
          </>
        ) : isPos ? (
          <>
            <Row label="Bankaya aktarılan" value={fmtMoney(a.totalOut, a.currency)} />
            <Row label="Komisyon / Valör" value={`%${a.commissionRate ?? 0} · ${a.valorDays ?? 0} gün`} />
            <Row label="Yatacağı hesap" value={a.linkedBank?.name ?? "—"} />
          </>
        ) : (
          <>
            <Row label="Toplam giriş" value={<span className="text-success">{fmtMoney(a.totalIn, a.currency)}</span>} />
            <Row label="Toplam çıkış" value={<span className="text-error">{fmtMoney(a.totalOut, a.currency)}</span>} />
            {a.openingBalance !== 0 && <Row label="Açılış" value={fmtMoney(a.openingBalance, a.currency)} />}
          </>
        )}

        {/* Aksiyonlar */}
        <div className="mt-auto flex items-center justify-between border-t border-gray-150 pt-3 dark:border-dark-500">
          <div className="flex gap-1.5">
            {canWrite && a.isActive && (
              <>
                {a.type !== "CREDIT_CARD" && <RoundBtn title="Tahsilat" Icon={TbArrowDownLeft} tone="hover:text-success" onClick={onCollect} />}
                {a.type !== "POS" && <RoundBtn title={isCard ? "Kartla Harcama" : "Ödeme"} Icon={TbArrowUpRight} tone="hover:text-error" onClick={onPay} />}
                {(a.type === "CASH" || a.type === "BANK") && <RoundBtn title="Virman" Icon={TbArrowsExchange} tone="hover:text-info" onClick={onTransfer} />}
              </>
            )}
            <Link
              to={`/finance/movements?cashRegisterId=${a.id}`}
              title="Hareketler"
              className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-primary-600 dark:bg-dark-600 dark:text-dark-200"
            >
              <TbListDetails className="size-4" />
            </Link>
          </div>
          <div className="flex gap-1.5">
            {canWrite && isPos && a.pendingPos > 0 && (
              <Button color="primary" variant="soft" className="h-8 gap-1 px-2.5 text-xs" onClick={onSettle}>
                <TbTransferIn className="size-4" /> Bankaya Aktar
              </Button>
            )}
            {canWrite && isCard && (a.cardDebt ?? 0) > 0 && (
              <Button color="primary" variant="soft" className="h-8 px-2.5 text-xs" onClick={onTransfer}>
                Borç Öde
              </Button>
            )}
            {canWrite && (
              <span className="flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                <RoundBtn title="Düzenle" Icon={TbPencil} tone="hover:text-primary-600" onClick={onEdit} />
                {onDelete && <RoundBtn title="Sil" Icon={TbTrash} tone="hover:text-error" onClick={onDelete} />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-gray-600 dark:text-dark-200">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function RoundBtn({ title, Icon, tone, onClick }: { title: string; Icon: React.ElementType; tone: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={clsx("flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition dark:bg-dark-600 dark:text-dark-200", tone)}
    >
      <Icon className="size-4" />
    </button>
  );
}
