import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import clsx from "clsx";
import {
  TbBuildingBank,
  TbCash,
  TbCreditCard,
  TbDeviceMobileDollar,
  TbFileInvoice,
  TbLayoutGrid,
  TbListDetails,
  TbReceipt2,
  TbScale,
} from "react-icons/tb";
import { toast } from "sonner";

import { NumericInput } from "@/components/ui";
import type { Account } from "@/@types/account";
import type {
  AgingBucket,
  ChequeStatus,
  Currency,
  FinanceAccount,
  FinanceAccountType,
  FinanceInvoiceType,
  FinanceModule,
  FinanceMovementType,
} from "@/@types/finance";
import type { SearchableOption } from "@/components/shared/SearchableSelect";
import { getFxRates, listFinanceAccounts } from "@/services/financeService";
import { listAccounts } from "@/services/accountService";

// ---------------------------------------------------------------------------
// Etiketler & renkler
// ---------------------------------------------------------------------------

export const ACCOUNT_TYPE_LABEL: Record<FinanceAccountType, string> = {
  CASH: "Kasa",
  BANK: "Banka",
  POS: "POS",
  CREDIT_CARD: "Kredi Kartı",
};

export const MODULE_LABEL: Record<FinanceModule, string> = {
  ...ACCOUNT_TYPE_LABEL,
  CHEQUE: "Çek / Senet",
};

/** Kart başlığı ikon + gradyan */
export const ACCOUNT_TYPE_META: Record<
  FinanceModule,
  { Icon: React.ElementType; gradient: string; soft: string }
> = {
  CASH: { Icon: TbCash, gradient: "from-emerald-500 to-teal-600", soft: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  BANK: { Icon: TbBuildingBank, gradient: "from-sky-500 to-indigo-600", soft: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  POS: { Icon: TbDeviceMobileDollar, gradient: "from-violet-500 to-fuchsia-600", soft: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  CREDIT_CARD: { Icon: TbCreditCard, gradient: "from-orange-500 to-rose-600", soft: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  CHEQUE: { Icon: TbReceipt2, gradient: "from-amber-500 to-yellow-600", soft: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

export const MOVEMENT_TYPE_LABEL: Record<FinanceMovementType, string> = {
  COLLECTION: "Tahsilat",
  PAYMENT: "Ödeme",
  TRANSFER: "Virman",
  POS_COLLECTION: "POS Tahsilatı",
  POS_SETTLEMENT: "POS → Banka",
  COMMISSION: "Komisyon",
  CARD_EXPENSE: "KK Harcaması",
  CARD_PAYMENT: "KK Ödemesi",
  CHEQUE_RECEIVED: "Çek Alındı",
  CHEQUE_ENDORSED: "Çek Ciro",
  CHEQUE_COLLECTED: "Çek Tahsil",
  CHEQUE_BOUNCED: "Karşılıksız / İade",
  CHEQUE_ISSUED: "Çek Verildi",
  CHEQUE_PAID: "Çek Ödendi",
};

export const CHEQUE_STATUS_LABEL: Record<ChequeStatus, string> = {
  PORTFOLIO: "Portföyde",
  IN_COLLECTION: "Tahsilde",
  ENDORSED: "Ciro Edildi",
  COLLECTED: "Tahsil Edildi",
  BOUNCED: "Karşılıksız",
  RETURNED: "İade Edildi",
  ISSUED: "Verildi",
  PAID: "Ödendi",
};

export const CHEQUE_STATUS_COLOR: Record<ChequeStatus, string> = {
  PORTFOLIO: "bg-info/15 text-info",
  IN_COLLECTION: "bg-secondary/15 text-secondary",
  ENDORSED: "bg-gray-500/15 text-gray-600 dark:text-dark-200",
  COLLECTED: "bg-success/15 text-success",
  BOUNCED: "bg-error/15 text-error",
  RETURNED: "bg-warning/15 text-warning",
  ISSUED: "bg-warning/15 text-warning",
  PAID: "bg-success/15 text-success",
};

export const INVOICE_TYPE_LABEL: Record<FinanceInvoiceType, string> = {
  SALES: "Satış Faturası",
  PURCHASE: "Alış Faturası",
  RENTAL: "Kira Faturası",
  EXPENSE: "Masraf",
};

export const BUCKET_LABEL: Record<AgingBucket, string> = {
  NOT_DUE: "Vadesi Gelmemiş",
  D0_30: "1-30 Gün",
  D31_60: "31-60 Gün",
  D61_90: "61-90 Gün",
  D90_PLUS: "90+ Gün",
};

export const BUCKET_COLOR: Record<AgingBucket, string> = {
  NOT_DUE: "bg-success",
  D0_30: "bg-info",
  D31_60: "bg-warning",
  D61_90: "bg-orange-500",
  D90_PLUS: "bg-error",
};

export const CURRENCIES: Currency[] = ["TRY", "EUR", "USD", "GBP"];
const CURRENCY_SYMBOL: Record<Currency, string> = { TRY: "₺", EUR: "€", USD: "$", GBP: "£" };
export const currencySymbol = (c?: string | null) => CURRENCY_SYMBOL[(c || "TRY") as Currency] ?? c ?? "₺";

// ---------------------------------------------------------------------------
// Biçimlendirme
// ---------------------------------------------------------------------------

export function fmtMoney(v: number | string | null | undefined, currency: string = "TRY") {
  const n = Number(v || 0);
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySymbol(currency)}`;
}

export function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR");
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const errMsg = (err: unknown, fallback = "İşlem başarısız") =>
  (err as { message?: string | string[] })?.message
    ? [(err as { message: string | string[] }).message].flat().join(", ")
    : fallback;

// ---------------------------------------------------------------------------
// Veri kancaları
// ---------------------------------------------------------------------------

/** Finans hesapları (bakiyeleriyle) */
export function useFinanceAccounts() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await listFinanceAccounts());
    } catch (err) {
      toast.error(errMsg(err, "Hesaplar yüklenemedi"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { accounts, loading, reload };
}

export function financeAccountOptions(accounts: FinanceAccount[], types?: FinanceAccountType[]): SearchableOption[] {
  return accounts
    .filter((a) => a.isActive && (!types || types.includes(a.type)))
    .map((a) => ({
      value: a.id,
      label: a.name,
      subLabel: `${fmtMoney(a.type === "CREDIT_CARD" ? -(a.cardDebt ?? 0) : a.balance, a.currency)}${a.bankName ? ` · ${a.bankName}` : ""}`,
      badge: a.currency !== "TRY" ? a.currency : ACCOUNT_TYPE_LABEL[a.type],
    }));
}

/** Cari seçenekleri (aranabilir seçim için) */
export function useAccountOptions(enabled = true) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    if (!enabled) return;
    listAccounts({ onlyActive: true, pageSize: 500 })
      .then((r) => setAccounts(r.items))
      .catch(() => void 0);
  }, [enabled]);
  const options: SearchableOption[] = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    subLabel: [a.phone, a.taxNumber || a.tckn].filter(Boolean).join(" · ") || undefined,
    badge: a.type === "CUSTOMER" ? "Müşteri" : a.type === "SUPPLIER" ? "Tedarikçi" : "Müş./Ted.",
  }));
  return { accounts, options };
}

// ---------------------------------------------------------------------------
// Bileşenler
// ---------------------------------------------------------------------------

/** Döviz kuru alanı: TCMB'den doldur butonu */
export function RateInput({
  currency,
  value,
  onChange,
  label = "TL Kuru",
}: {
  currency: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const fill = async () => {
    setLoading(true);
    try {
      const fx = await getFxRates();
      const r = fx.rates.find((x) => x.code === currency);
      if (!r) throw new Error(`${currency} kuru bulunamadı`);
      onChange(r.selling);
      toast.success(`TCMB ${fx.date ?? ""} ${currency} satış: ${r.selling}`);
    } catch (err) {
      toast.error(errMsg(err, "Kur alınamadı"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-dark-100">
          {label} <span className="text-gray-400">(1 {currency})</span>
        </span>
        <button type="button" onClick={fill} disabled={loading} className="text-xs font-semibold text-primary-600 hover:underline disabled:opacity-50 dark:text-primary-400">
          {loading ? "Alınıyor..." : "TCMB'den getir"}
        </button>
      </div>
      <NumericInput value={value ?? null} onValueChange={onChange} numeralDecimalScale={4} suffix="₺" />
    </div>
  );
}

export function MovementTypeBadge({ type }: { type: FinanceMovementType }) {
  const color =
    type === "COLLECTION" || type === "POS_COLLECTION" || type === "CHEQUE_RECEIVED" || type === "CHEQUE_COLLECTED"
      ? "bg-success/15 text-success"
      : type === "PAYMENT" || type === "CARD_EXPENSE" || type === "CHEQUE_ISSUED" || type === "CHEQUE_PAID" || type === "CHEQUE_ENDORSED"
        ? "bg-error/15 text-error"
        : type === "CHEQUE_BOUNCED" || type === "COMMISSION"
          ? "bg-warning/15 text-warning"
          : "bg-info/15 text-info";
  return <span className={clsx("whitespace-nowrap rounded px-1.5 py-0.5 text-tiny font-semibold", color)}>{MOVEMENT_TYPE_LABEL[type]}</span>;
}

export function ChequeStatusBadge({ status }: { status: ChequeStatus }) {
  return (
    <span className={clsx("whitespace-nowrap rounded px-1.5 py-0.5 text-tiny font-semibold", CHEQUE_STATUS_COLOR[status])}>
      {CHEQUE_STATUS_LABEL[status]}
    </span>
  );
}

/** Küçük KPI kutusu */
export function Kpi({
  label,
  value,
  hint,
  tone = "default",
  Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "success" | "error" | "warning" | "info";
  Icon?: React.ElementType;
}) {
  const toneCls = {
    default: "text-gray-800 dark:text-dark-50",
    success: "text-success",
    error: "text-error",
    warning: "text-warning",
    info: "text-info",
  }[tone];
  return (
    <div className="rounded-2xl border border-gray-150 bg-white p-4 shadow-sm dark:border-dark-600 dark:bg-dark-700">
      <div className="flex items-center justify-between">
        <p className="text-tiny font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-300">{label}</p>
        {Icon && <Icon className="size-5 text-gray-300 dark:text-dark-400" />}
      </div>
      <p className={clsx("mt-1.5 truncate text-lg font-bold", toneCls)}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-dark-300">{hint}</p>}
    </div>
  );
}

const FINANCE_TABS = [
  { id: "dashboard", label: "Panel", to: "/finance", Icon: TbLayoutGrid },
  { id: "movements", label: "Hareketler", to: "/finance/movements", Icon: TbListDetails },
] as const;

/** Panelden açılan detay ekranları (menüde yok) */
const FINANCE_SUBPAGES: { to: string; label: string; Icon: React.ElementType }[] = [
  { to: "/finance/accounts", label: "Kasa & Banka", Icon: TbBuildingBank },
  { to: "/finance/cheques", label: "Çek & Senet", Icon: TbReceipt2 },
  { to: "/finance/receivables", label: "Alacak & Borç", Icon: TbScale },
  { to: "/finance/statement", label: "Cari Ekstre", Icon: TbFileInvoice },
];

/** Finans üst menüsü: Panel · Hareketler (+ açık olan detay ekranı) */
export function FinanceNav({ actions }: { actions?: React.ReactNode }) {
  const { pathname } = useLocation();
  const sub = FINANCE_SUBPAGES.find((p) => pathname.startsWith(p.to));
  const pill = (active: boolean) =>
    clsx(
      "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
      active
        ? "bg-primary-500 font-bold text-white shadow-xs shadow-primary-500/25"
        : "border border-gray-200 bg-white text-gray-700 shadow-xs hover:border-gray-300 hover:bg-gray-50 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-200 dark:hover:border-dark-600 dark:hover:bg-dark-700",
    );
  return (
    <div className="flex flex-col gap-2 border-b border-gray-200/80 pb-2 dark:border-dark-700/80 sm:flex-row sm:items-center sm:justify-between">
      <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto">
        {FINANCE_TABS.map(({ id, label, to, Icon }) => {
          const active = !sub && (id === "dashboard" ? pathname === "/finance" : pathname.startsWith(to));
          return (
            <Link key={id} to={to} className={pill(active)}>
              <Icon className={clsx("size-4 shrink-0", active ? "text-white" : "text-gray-500 dark:text-dark-400")} />
              <span>{label}</span>
            </Link>
          );
        })}
        {sub && (
          <>
            <span className="px-0.5 text-gray-300 dark:text-dark-500">/</span>
            <span className={pill(true)}>
              <sub.Icon className="size-4 shrink-0 text-white" />
              <span>{sub.label}</span>
            </span>
          </>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
