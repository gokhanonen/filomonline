import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { TbArrowDownLeft, TbArrowUpRight, TbArrowsExchange, TbBolt, TbInfoCircle } from "react-icons/tb";

import { Button, Input, NumericInput, Textarea } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type {
  AllocationInput,
  Cheque,
  ChequeKind,
  Currency,
  FinanceModule,
  InvoiceSide,
  OpenInvoice,
} from "@/@types/finance";
import type { Vehicle } from "@/@types/vehicle";
import {
  createCollection,
  createPayment,
  createTransfer,
  listCheques,
  listOpenInvoices,
} from "@/services/financeService";
import { listVehicles } from "@/services/vehicleService";
import {
  ACCOUNT_TYPE_META,
  CURRENCIES,
  INVOICE_TYPE_LABEL,
  RateInput,
  currencySymbol,
  errMsg,
  financeAccountOptions,
  fmtDate,
  fmtMoney,
  todayISO,
  useAccountOptions,
  useFinanceAccounts,
} from "./shared";

export type OperationMode = "collection" | "payment" | "transfer";

export interface OperationDefaults {
  accountId?: string;
  cashRegisterId?: string;
  module?: FinanceModule;
  /** Ödeme: portföydeki çeki ciro et */
  endorseChequeId?: string;
  amount?: number;
  fromId?: string;
  toId?: string;
}

export interface OperationModalProps {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
  mode: OperationMode;
  defaults?: OperationDefaults;
}

const MODES: { id: OperationMode; label: string; Icon: React.ElementType; tone: string }[] = [
  { id: "collection", label: "Tahsilat", Icon: TbArrowDownLeft, tone: "text-success" },
  { id: "payment", label: "Ödeme", Icon: TbArrowUpRight, tone: "text-error" },
  { id: "transfer", label: "Virman", Icon: TbArrowsExchange, tone: "text-info" },
];

const COLLECTION_MODULES: { id: FinanceModule; label: string }[] = [
  { id: "CASH", label: "Nakit" },
  { id: "BANK", label: "Havale / EFT" },
  { id: "POS", label: "POS (Kart)" },
  { id: "CHEQUE", label: "Çek / Senet" },
];

const PAYMENT_MODULES: { id: FinanceModule; label: string }[] = [
  { id: "CASH", label: "Nakit" },
  { id: "BANK", label: "Havale / EFT" },
  { id: "CREDIT_CARD", label: "Şirket Kartı" },
  { id: "CHEQUE", label: "Çek / Senet" },
];

interface FormState {
  date: string;
  accountId: string;
  module: FinanceModule;
  cashRegisterId: string;
  amount?: number;
  exchangeRate?: number;
  documentNo: string;
  description: string;
  vehicleId: string;
  // çek / senet
  chequeMode: "new" | "endorse";
  endorseChequeId: string;
  chequeKind: ChequeKind;
  serialNo: string;
  bankName: string;
  branchName: string;
  drawer: string;
  dueDate: string;
  chequeCurrency: Currency;
  bankRegisterId: string;
  // virman
  fromId: string;
  toId: string;
  toAmount?: number;
}

const emptyState = (mode: OperationMode, d?: OperationDefaults): FormState => ({
  date: todayISO(),
  accountId: d?.accountId ?? "",
  module: d?.module ?? (mode === "payment" ? "BANK" : "CASH"),
  cashRegisterId: d?.cashRegisterId ?? "",
  amount: d?.amount,
  exchangeRate: undefined,
  documentNo: "",
  description: "",
  vehicleId: "",
  chequeMode: d?.endorseChequeId ? "endorse" : "new",
  endorseChequeId: d?.endorseChequeId ?? "",
  chequeKind: "CHEQUE",
  serialNo: "",
  bankName: "",
  branchName: "",
  drawer: "",
  dueDate: "",
  chequeCurrency: "TRY",
  bankRegisterId: "",
  fromId: d?.fromId ?? "",
  toId: d?.toId ?? "",
  toAmount: undefined,
});

/**
 * Tek işlem formu: Tahsilat (kasa/banka/POS/çek), Ödeme (kasa/banka/şirket kartı/çek: yeni ya da ciro),
 * Virman (kasa↔banka, bankadan kredi kartı ödemesi). Cari seçilince açık faturaları eşleştirilebilir.
 */
export function OperationModal({ open, onClose, onDone, mode: initialMode, defaults }: OperationModalProps) {
  const [mode, setMode] = useState<OperationMode>(initialMode);
  const [f, setF] = useState<FormState>(() => emptyState(initialMode, defaults));
  const [saving, setSaving] = useState(false);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [alloc, setAlloc] = useState<Record<string, number | undefined>>({});
  const [portfolio, setPortfolio] = useState<Cheque[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const { accounts: finAccounts, reload: reloadFin } = useFinanceAccounts();
  const { options: accountOptions } = useAccountOptions(open);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  // Açılışta sıfırla
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setF(emptyState(initialMode, defaults));
    setAlloc({});
    void reloadFin();
    listVehicles({ pageSize: 200 }).then((r) => setVehicles(r.items)).catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mod değişince modül uygun değilse düzelt
  useEffect(() => {
    const allowed = (mode === "payment" ? PAYMENT_MODULES : COLLECTION_MODULES).map((m) => m.id);
    if (mode !== "transfer" && !allowed.includes(f.module)) set("module", allowed[0]);
    setAlloc({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const side: InvoiceSide = mode === "collection" ? "RECEIVABLE" : "PAYABLE";

  // Carinin açık faturaları
  useEffect(() => {
    if (!open || mode === "transfer" || !f.accountId) {
      setOpenInvoices([]);
      return;
    }
    listOpenInvoices({ accountId: f.accountId, side }).then(setOpenInvoices).catch(() => setOpenInvoices([]));
    setAlloc({});
  }, [open, mode, f.accountId, side]);

  // Ciro için portföydeki çekler
  useEffect(() => {
    if (!open || mode !== "payment" || f.module !== "CHEQUE") return;
    listCheques({ direction: "RECEIVED", status: "PORTFOLIO", pageSize: 500 })
      .then((r) => setPortfolio(r.items))
      .catch(() => void 0);
  }, [open, mode, f.module]);

  const selectedReg = finAccounts.find((a) => a.id === f.cashRegisterId);
  const endorseCheque = portfolio.find((c) => c.id === f.endorseChequeId);
  const chequeBank = finAccounts.find((a) => a.id === f.bankRegisterId);
  const fromReg = finAccounts.find((a) => a.id === f.fromId);
  const toReg = finAccounts.find((a) => a.id === f.toId);

  const isEndorse = mode === "payment" && f.module === "CHEQUE" && f.chequeMode === "endorse";
  const isNewCheque = f.module === "CHEQUE" && !isEndorse;

  // İşlemin dövizi
  const currency: Currency =
    mode === "transfer"
      ? (fromReg?.currency ?? "TRY")
      : f.module === "CHEQUE"
        ? isEndorse
          ? (endorseCheque?.currency ?? "TRY")
          : mode === "payment" && f.chequeKind === "CHEQUE" && chequeBank
            ? chequeBank.currency
            : f.chequeCurrency
        : (selectedReg?.currency ?? "TRY");

  const amount = isEndorse ? (endorseCheque?.amount ?? 0) : (f.amount ?? 0);
  const rate = currency === "TRY" ? 1 : f.exchangeRate ?? 0;
  const amountTry = Math.round(amount * rate * 100) / 100;

  // Ciro edilen çekin tutarını forma yansıt
  useEffect(() => {
    if (isEndorse && endorseCheque) set("amount", endorseCheque.amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEndorse, endorseCheque?.id]);

  const regTypes = f.module === "CHEQUE" ? [] : [f.module as "CASH" | "BANK" | "POS" | "CREDIT_CARD"];
  const regOptions = useMemo(() => financeAccountOptions(finAccounts, regTypes), [finAccounts, f.module]); // eslint-disable-line react-hooks/exhaustive-deps
  const bankOptions = useMemo(() => financeAccountOptions(finAccounts, ["BANK"]), [finAccounts]);
  const fromOptions = useMemo(() => financeAccountOptions(finAccounts, ["CASH", "BANK"]), [finAccounts]);
  const toOptions = useMemo(
    () => financeAccountOptions(finAccounts, ["CASH", "BANK", "CREDIT_CARD"]).filter((o) => o.value !== f.fromId),
    [finAccounts, f.fromId],
  );
  const vehicleOptions = useMemo(
    () => vehicles.map((v) => ({ value: v.id, label: v.plate, subLabel: [v.brandName, v.modelName].filter(Boolean).join(" ") })),
    [vehicles],
  );
  const chequeOptions = useMemo(
    () =>
      portfolio.map((c) => ({
        value: c.id,
        label: `#${c.serialNo} · ${fmtMoney(c.amount, c.currency)}`,
        subLabel: `${c.account?.name ?? c.drawer ?? ""} · Vade ${fmtDate(c.dueDate)}${c.bankName ? ` · ${c.bankName}` : ""}`,
        badge: c.kind === "NOTE" ? "Senet" : "Çek",
      })),
    [portfolio],
  );

  // Eşleştirme
  const allocations: AllocationInput[] = openInvoices
    .filter((o) => (alloc[`${o.invoiceType}:${o.invoiceId}`] ?? 0) > 0)
    .map((o) => ({ invoiceType: o.invoiceType, invoiceId: o.invoiceId, amount: alloc[`${o.invoiceType}:${o.invoiceId}`]! }));
  const allocated = Math.round(allocations.reduce((s, a) => s + a.amount, 0) * 100) / 100;
  const unallocated = Math.round((amountTry - allocated) * 100) / 100;

  const autoAllocate = () => {
    let remaining = amountTry;
    const next: Record<string, number | undefined> = {};
    for (const o of [...openInvoices].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))) {
      if (remaining <= 0) break;
      const v = Math.round(Math.min(remaining, o.open) * 100) / 100;
      next[`${o.invoiceType}:${o.invoiceId}`] = v;
      remaining = Math.round((remaining - v) * 100) / 100;
    }
    setAlloc(next);
  };

  const toggleInvoice = (o: OpenInvoice) => {
    const key = `${o.invoiceType}:${o.invoiceId}`;
    setAlloc((a) => {
      if (a[key]) return { ...a, [key]: undefined };
      const used = Object.entries(a).reduce((s, [k, v]) => (k === key ? s : s + (v ?? 0)), 0);
      const room = Math.max(0, Math.round((amountTry - used) * 100) / 100);
      return { ...a, [key]: Math.min(o.open, room || o.open) };
    });
  };

  const submit = async () => {
    if (!f.date) return toast.error("Tarih giriniz");
    if (mode !== "transfer" && !amount) return toast.error("Tutar giriniz");
    if (currency !== "TRY" && !rate) return toast.error(`${currency} için TL kuru giriniz`);
    if (allocated > amountTry + 0.001) return toast.error("Eşleştirilen tutar işlem tutarını aşıyor");

    const common = {
      date: f.date,
      amount,
      exchangeRate: currency !== "TRY" ? rate : undefined,
      documentNo: f.documentNo || undefined,
      description: f.description || undefined,
      vehicleId: f.vehicleId || undefined,
      allocations: allocations.length ? allocations : undefined,
    };
    const newCheque = isNewCheque
      ? {
          kind: f.chequeKind,
          serialNo: f.serialNo,
          bankName: f.bankName || undefined,
          branchName: f.branchName || undefined,
          drawer: f.drawer || undefined,
          dueDate: f.dueDate,
          currency,
          bankRegisterId: mode === "payment" && f.bankRegisterId ? f.bankRegisterId : undefined,
        }
      : undefined;
    if (isNewCheque && (!f.serialNo || !f.dueDate)) return toast.error("Çek/senet seri no ve vade tarihi zorunlu");

    setSaving(true);
    try {
      if (mode === "collection") {
        if (!f.accountId) throw { message: "Cari seçiniz" };
        await createCollection({
          ...common,
          accountId: f.accountId,
          module: f.module as "CASH" | "BANK" | "POS" | "CHEQUE",
          cashRegisterId: f.module !== "CHEQUE" ? f.cashRegisterId : undefined,
          cheque: newCheque,
        });
        toast.success("Tahsilat kaydedildi");
      } else if (mode === "payment") {
        await createPayment({
          ...common,
          accountId: f.accountId || undefined,
          module: f.module as "CASH" | "BANK" | "CREDIT_CARD" | "CHEQUE",
          cashRegisterId: f.module !== "CHEQUE" ? f.cashRegisterId : undefined,
          cheque: newCheque,
          endorseChequeId: isEndorse ? f.endorseChequeId : undefined,
        });
        toast.success(isEndorse ? "Çek ciro edildi" : "Ödeme kaydedildi");
      } else {
        if (!f.fromId || !f.toId) throw { message: "Kaynak ve hedef hesap seçiniz" };
        await createTransfer({
          date: f.date,
          fromId: f.fromId,
          toId: f.toId,
          amount,
          toAmount: fromReg && toReg && fromReg.currency !== toReg.currency ? f.toAmount : undefined,
          exchangeRate: currency !== "TRY" ? rate : undefined,
          documentNo: f.documentNo || undefined,
          description: f.description || undefined,
        });
        toast.success(toReg?.type === "CREDIT_CARD" ? "Kredi kartı ödemesi kaydedildi" : "Virman kaydedildi");
      }
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const modules = mode === "payment" ? PAYMENT_MODULES : COLLECTION_MODULES;

  return (
    <Modal open={open} onClose={onClose} title="Finans İşlemi" className="max-w-4xl">
      <div className="space-y-5">
        {/* İşlem tipi */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
          {MODES.map(({ id, label, Icon, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition",
                mode === id ? "bg-white shadow-sm dark:bg-dark-600" : "text-gray-500 hover:text-gray-700 dark:text-dark-300",
              )}
            >
              <Icon className={clsx("size-5", mode === id && tone)} />
              {label}
            </button>
          ))}
        </div>

        {mode !== "transfer" ? (
          <>
            {/* Cari + yöntem */}
            <div className="grid gap-4 md:grid-cols-2">
              <SearchableSelect
                label={mode === "collection" ? "Cari (Müşteri) *" : `Cari (Tedarikçi)${f.module === "CHEQUE" ? " *" : ""}`}
                placeholder="Cari ara..."
                options={accountOptions}
                value={f.accountId}
                onChange={(v) => set("accountId", v)}
                onClear={() => set("accountId", "")}
              />
              <Input label="Tarih *" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-dark-100">
                {mode === "collection" ? "Tahsilat Şekli" : "Ödeme Şekli"}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {modules.map(({ id, label }) => {
                  const { Icon, gradient } = ACCOUNT_TYPE_META[id];
                  const active = f.module === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        set("module", id);
                        set("cashRegisterId", "");
                      }}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm font-semibold transition",
                        active
                          ? "border-primary-500 bg-primary-500/5 text-gray-800 ring-2 ring-primary-500/20 dark:text-dark-50"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-dark-500 dark:text-dark-200",
                      )}
                    >
                      <span className={clsx("flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white", gradient)}>
                        <Icon className="size-4.5" />
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hesap ya da çek */}
            {f.module !== "CHEQUE" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SearchableSelect
                  label={`${f.module === "CASH" ? "Kasa" : f.module === "BANK" ? "Banka Hesabı" : f.module === "POS" ? "POS" : "Kredi Kartı"} *`}
                  placeholder="Hesap seç..."
                  options={regOptions}
                  value={f.cashRegisterId}
                  onChange={(v) => set("cashRegisterId", v)}
                />
                {selectedReg?.type === "POS" && (
                  <Hint>
                    Valör {selectedReg.valorDays ?? 0} gün · Komisyon %{selectedReg.commissionRate ?? 0}. Tutar valör gününde
                    {selectedReg.linkedBank ? ` ${selectedReg.linkedBank.name} hesabına` : " bankaya"} "Bankaya Aktar" ile geçer.
                  </Hint>
                )}
                {selectedReg?.type === "CREDIT_CARD" && (
                  <Hint>
                    Kalan limit {fmtMoney(selectedReg.availableLimit, selectedReg.currency)} · Dönem harcaması{" "}
                    {fmtMoney(selectedReg.period?.spend, selectedReg.currency)}
                    {selectedReg.period?.dueDate ? ` · Son ödeme ${fmtDate(selectedReg.period.dueDate)}` : ""}
                  </Hint>
                )}
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-dashed border-amber-400/60 bg-amber-50/40 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
                {mode === "payment" && (
                  <div className="flex gap-2">
                    {(["new", "endorse"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => set("chequeMode", m)}
                        className={clsx(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                          f.chequeMode === m ? "bg-amber-500 text-white" : "bg-white text-gray-600 dark:bg-dark-700 dark:text-dark-200",
                        )}
                      >
                        {m === "new" ? "Kendi Çekimizi / Senedimizi Ver" : "Portföyden Ciro Et"}
                      </button>
                    ))}
                  </div>
                )}

                {isEndorse ? (
                  <SearchableSelect
                    label="Portföydeki Çek *"
                    placeholder="Seri no, keşideci ara..."
                    options={chequeOptions}
                    value={f.endorseChequeId}
                    onChange={(v) => set("endorseChequeId", v)}
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-dark-100">Tür</p>
                      <div className="flex gap-2">
                        {(["CHEQUE", "NOTE"] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => set("chequeKind", k)}
                            className={clsx(
                              "flex-1 rounded-lg border py-2 text-sm font-semibold",
                              f.chequeKind === k ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-gray-200 text-gray-500 dark:border-dark-500",
                            )}
                          >
                            {k === "CHEQUE" ? "Çek" : "Senet"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input label="Seri / Senet No *" value={f.serialNo} onChange={(e) => set("serialNo", e.target.value)} />
                    <Input label="Vade Tarihi *" type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
                    {mode === "payment" && f.chequeKind === "CHEQUE" ? (
                      <div className="md:col-span-2">
                        <SearchableSelect
                          label="Çekin Ödeneceği Banka Hesabı *"
                          placeholder="Banka hesabı seç..."
                          options={bankOptions}
                          value={f.bankRegisterId}
                          onChange={(v) => set("bankRegisterId", v)}
                        />
                      </div>
                    ) : (
                      <>
                        {mode === "collection" && f.chequeKind === "CHEQUE" && (
                          <>
                            <Input label="Banka" placeholder="Örn. Akbank" value={f.bankName} onChange={(e) => set("bankName", e.target.value)} />
                            <Input label="Şube" value={f.branchName} onChange={(e) => set("branchName", e.target.value)} />
                          </>
                        )}
                        <Input
                          label={mode === "collection" ? "Keşideci / Borçlu" : "Borçlu"}
                          placeholder="Boşsa cari adı"
                          value={f.drawer}
                          onChange={(e) => set("drawer", e.target.value)}
                        />
                      </>
                    )}
                    {!(mode === "payment" && f.chequeKind === "CHEQUE") && (
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-dark-100">Döviz</p>
                        <div className="flex gap-1">
                          {CURRENCIES.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => set("chequeCurrency", c)}
                              className={clsx(
                                "flex-1 rounded-lg border py-2 text-xs font-bold",
                                f.chequeCurrency === c ? "border-primary-500 bg-primary-500/10 text-primary-600" : "border-gray-200 text-gray-500 dark:border-dark-500",
                              )}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tutar */}
            <div className="grid gap-4 md:grid-cols-3">
              <NumericInput
                label={`Tutar * (${currency})`}
                value={amount || null}
                onValueChange={(v) => set("amount", v)}
                suffix={currencySymbol(currency)}
                disabled={isEndorse}
              />
              {currency !== "TRY" && <RateInput currency={currency} value={f.exchangeRate} onChange={(v) => set("exchangeRate", v)} />}
              {currency !== "TRY" && (
                <div className="flex flex-col justify-end">
                  <p className="text-xs text-gray-400">TL Karşılığı</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-dark-50">{fmtMoney(amountTry)}</p>
                </div>
              )}
              <Input label="Belge / Dekont No" value={f.documentNo} onChange={(e) => set("documentNo", e.target.value)} />
              <SearchableSelect
                label="Araç (opsiyonel)"
                placeholder="Plaka ara..."
                options={vehicleOptions}
                value={f.vehicleId}
                onChange={(v) => set("vehicleId", v)}
                onClear={() => set("vehicleId", "")}
              />
            </div>

            {/* Fatura eşleştirme */}
            {f.accountId && (
              <div className="rounded-xl border border-gray-200 dark:border-dark-500">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-dark-500">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                      Açık {mode === "collection" ? "Alacak" : "Borç"} Faturaları
                    </p>
                    <p className="text-xs text-gray-400">
                      Eşleşen {fmtMoney(allocated)} · {unallocated >= 0 ? `Serbest (avans) ${fmtMoney(unallocated)}` : `Fazla ${fmtMoney(-unallocated)}`}
                    </p>
                  </div>
                  {openInvoices.length > 0 && (
                    <div className="flex gap-2">
                      <Button variant="soft" color="primary" className="h-8 gap-1 px-3 text-xs" onClick={autoAllocate} disabled={!amountTry}>
                        <TbBolt className="size-4" /> Eski vadeden dağıt
                      </Button>
                      <Button variant="flat" className="h-8 px-3 text-xs" onClick={() => setAlloc({})}>
                        Temizle
                      </Button>
                    </div>
                  )}
                </div>
                {openInvoices.length === 0 ? (
                  <p className="px-4 py-5 text-center text-sm text-gray-400">Açık fatura yok — işlem cariye avans/serbest bakiye olarak işlenir.</p>
                ) : (
                  <div className="max-h-60 divide-y divide-gray-100 overflow-y-auto dark:divide-dark-600">
                    {openInvoices.map((o) => {
                      const key = `${o.invoiceType}:${o.invoiceId}`;
                      const checked = (alloc[key] ?? 0) > 0;
                      return (
                        <div key={key} className={clsx("flex items-center gap-3 px-4 py-2", checked && "bg-primary-500/5")}>
                          <input type="checkbox" checked={checked} onChange={() => toggleInvoice(o)} className="size-4 accent-primary-600" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-700 dark:text-dark-100">
                              {o.invoiceNo || "—"} <span className="text-xs font-normal text-gray-400">· {INVOICE_TYPE_LABEL[o.invoiceType]}</span>
                              {o.vehiclePlate && <span className="ml-1.5 rounded bg-gray-100 px-1 text-tiny dark:bg-dark-600">{o.vehiclePlate}</span>}
                            </p>
                            <p className={clsx("text-xs", o.daysOverdue > 0 ? "text-error" : "text-gray-400")}>
                              Vade {fmtDate(o.dueDate)}
                              {o.daysOverdue > 0 ? ` · ${o.daysOverdue} gün gecikmiş` : ""} · Toplam {fmtMoney(o.total)}
                            </p>
                          </div>
                          <p className="hidden w-28 text-right text-sm font-semibold text-gray-700 dark:text-dark-100 sm:block">{fmtMoney(o.open)}</p>
                          <div className="w-36">
                            <NumericInput
                              value={alloc[key] ?? null}
                              onValueChange={(v) => setAlloc((a) => ({ ...a, [key]: v && v > o.open ? o.open : v }))}
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // ---- Virman ----
          <div className="space-y-4">
            <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
              <SearchableSelect label="Kaynak Hesap *" placeholder="Kasa / banka..." options={fromOptions} value={f.fromId} onChange={(v) => set("fromId", v)} />
              <TbArrowsExchange className="mx-auto mb-2.5 hidden size-6 text-gray-400 md:block" />
              <SearchableSelect label="Hedef Hesap *" placeholder="Kasa / banka / kredi kartı..." options={toOptions} value={f.toId} onChange={(v) => set("toId", v)} />
            </div>
            {toReg?.type === "CREDIT_CARD" && (
              <Hint>
                Kredi kartı borç ödemesi · Güncel borç {fmtMoney(toReg.cardDebt, toReg.currency)}
                {toReg.period?.dueDate ? ` · Son ödeme ${fmtDate(toReg.period.dueDate)}` : ""}
                {(toReg.cardDebt ?? 0) > 0 && (
                  <button type="button" className="ml-2 font-semibold text-primary-600 hover:underline" onClick={() => set("amount", toReg.cardDebt ?? undefined)}>
                    Tamamını öde
                  </button>
                )}
              </Hint>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Tarih *" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
              <NumericInput label={`Tutar * (${currency})`} value={f.amount ?? null} onValueChange={(v) => set("amount", v)} suffix={currencySymbol(currency)} />
              {fromReg && toReg && fromReg.currency !== toReg.currency && (
                <NumericInput
                  label={`Hedefe Giren (${toReg.currency})`}
                  value={f.toAmount ?? null}
                  onValueChange={(v) => set("toAmount", v)}
                  suffix={currencySymbol(toReg.currency)}
                />
              )}
              {currency !== "TRY" && <RateInput currency={currency} value={f.exchangeRate} onChange={(v) => set("exchangeRate", v)} />}
              <Input label="Dekont No" value={f.documentNo} onChange={(e) => set("documentNo", e.target.value)} />
            </div>
          </div>
        )}

        <Textarea label="Açıklama" rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />

        <div className="flex items-center justify-between border-t border-gray-150 pt-4 dark:border-dark-500">
          <p className="text-sm text-gray-500 dark:text-dark-300">
            {amount > 0 && (
              <>
                Toplam <span className="font-bold text-gray-800 dark:text-dark-50">{fmtMoney(amount, currency)}</span>
                {currency !== "TRY" && rate > 0 && <> · {fmtMoney(amountTry)}</>}
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="flat" onClick={onClose}>
              Vazgeç
            </Button>
            <Button color="primary" onClick={submit} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 self-end rounded-lg bg-info/10 px-3 py-2 text-xs text-info">
      <TbInfoCircle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
