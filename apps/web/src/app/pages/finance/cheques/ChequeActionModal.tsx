import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { TbAlertTriangle, TbArrowBackUp, TbBuildingBank, TbCash, TbCircleCheck, TbReceiptOff } from "react-icons/tb";
import { toast } from "sonner";

import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button, GhostSpinner, Input } from "@/components/ui";
import type { Cheque, FinanceAccount, FinanceAccountType } from "@/@types/finance";
import { bounceCheque, collectCheque, depositCheque, payCheque, withdrawCheque } from "@/services/financeService";
import { errMsg, financeAccountOptions, fmtDate, fmtMoney, todayISO } from "../shared";

export type ChequeAction = "deposit" | "collect" | "pay" | "bounce" | "withdraw";

interface Props {
  cheque: Cheque | null;
  action: ChequeAction | null;
  accounts: FinanceAccount[];
  onClose: () => void;
  onDone: () => void;
}

const TITLES: Record<ChequeAction, string> = {
  deposit: "Tahsile Ver",
  collect: "Tahsil Et",
  pay: "Öde",
  bounce: "Karşılıksız / İade",
  withdraw: "Tahsilden Geri Al",
};

const ACCOUNT_TYPES: Partial<Record<ChequeAction, FinanceAccountType[]>> = {
  deposit: ["BANK"],
  collect: ["CASH", "BANK"],
  pay: ["CASH", "BANK"],
};

export function ChequeActionModal({ cheque, action, accounts, onClose, onDone }: Props) {
  const open = !!cheque && !!action;
  const [date, setDate] = useState(todayISO());
  const [registerId, setRegisterId] = useState("");
  const [bounceStatus, setBounceStatus] = useState<"BOUNCED" | "RETURNED">("BOUNCED");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Modal her açıldığında formu sıfırla
  useEffect(() => {
    if (!open || !cheque) return;
    setDate(todayISO());
    setRegisterId(action === "collect" || action === "pay" ? cheque.bankRegisterId ?? "" : "");
    setBounceStatus("BOUNCED");
    setDescription("");
    setError(undefined);
  }, [open, cheque, action]);

  const options = useMemo(() => {
    if (!cheque || !action) return [];
    const types = ACCOUNT_TYPES[action];
    if (!types) return [];
    // Çekin dövizi ile aynı dövizdeki hesaplar
    return financeAccountOptions(
      accounts.filter((a) => a.currency === cheque.currency),
      types,
    );
  }, [accounts, cheque, action]);

  const needsRegister = action === "deposit" || action === "collect" || action === "pay";
  const needsDate = action === "collect" || action === "pay" || action === "bounce";

  const submit = async () => {
    if (!cheque || !action) return;
    if (needsRegister && !registerId) {
      setError(action === "deposit" ? "Banka hesabı seçin" : "Kasa / banka hesabı seçin");
      return;
    }
    if (needsDate && !date) {
      toast.error("Tarih girin");
      return;
    }
    setBusy(true);
    try {
      const desc = description.trim() || undefined;
      switch (action) {
        case "deposit":
          await depositCheque(cheque.id, registerId);
          toast.success("Çek tahsile verildi");
          break;
        case "collect":
          await collectCheque(cheque.id, { date, cashRegisterId: registerId, description: desc });
          toast.success("Çek tahsil edildi");
          break;
        case "pay":
          await payCheque(cheque.id, { date, cashRegisterId: registerId, description: desc });
          toast.success("Ödeme kaydedildi");
          break;
        case "bounce":
          await bounceCheque(cheque.id, { date, status: bounceStatus, description: desc });
          toast.success(bounceStatus === "BOUNCED" ? "Karşılıksız olarak işaretlendi" : "İade olarak işaretlendi");
          break;
        case "withdraw":
          await withdrawCheque(cheque.id);
          toast.success("Çek portföye geri alındı");
          break;
      }
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const kindLabel = cheque?.kind === "NOTE" ? "Senet" : "Çek";

  return (
    <Modal open={open} onClose={busy ? () => void 0 : onClose} title={action ? `${kindLabel} — ${TITLES[action]}` : ""} className="max-w-md">
      {cheque && action && (
        <div className="space-y-4">
          {/* Çek özeti */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-amber-400/60 bg-amber-50/60 px-3 py-2.5 dark:border-amber-500/40 dark:bg-amber-500/5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                {kindLabel} #{cheque.serialNo}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                Vade {fmtDate(cheque.dueDate)}
                {cheque.bankName ? ` · ${cheque.bankName}` : ""}
                {cheque.account ? ` · ${cheque.account.name}` : ""}
              </p>
            </div>
            <p className="whitespace-nowrap text-base font-bold tabular-nums text-gray-800 dark:text-dark-50">{fmtMoney(cheque.amount, cheque.currency)}</p>
          </div>

          {action === "withdraw" && (
            <p className="text-sm text-gray-600 dark:text-dark-200">
              {kindLabel} {cheque.bankRegister ? `"${cheque.bankRegister.name}" bankasından` : "bankadan"} geri alınıp portföye döndürülecek. Bu adım hareket
              oluşturmaz.
            </p>
          )}

          {action === "deposit" && (
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Tahsile verme yalnızca durum değişikliğidir; banka bakiyesi çek tahsil edildiğinde artar.
            </p>
          )}

          {needsDate && <Input label="İşlem Tarihi" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}

          {needsRegister && (
            <SearchableSelect
              label={action === "deposit" ? "Tahsil Bankası" : action === "pay" ? "Ödenecek Hesap (Kasa / Banka)" : "Tahsil Hesabı (Kasa / Banka)"}
              options={options}
              value={registerId}
              onChange={(v) => {
                setRegisterId(v);
                setError(undefined);
              }}
              placeholder={options.length ? "Hesap seçin" : `${cheque.currency} dövizinde uygun hesap yok`}
              error={error}
            />
          )}

          {action === "bounce" && (
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "BOUNCED", label: "Karşılıksız", hint: "Banka ödemedi", Icon: TbReceiptOff, tone: "error" },
                  { v: "RETURNED", label: "İade", hint: "Müşteriye geri verildi", Icon: TbArrowBackUp, tone: "warning" },
                ] as const
              ).map((o) => {
                const active = bounceStatus === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setBounceStatus(o.v)}
                    className={clsx(
                      "flex items-start gap-2 rounded-xl border p-3 text-left transition",
                      active
                        ? o.tone === "error"
                          ? "border-error bg-error/5 ring-1 ring-error/30"
                          : "border-warning bg-warning/5 ring-1 ring-warning/30"
                        : "border-gray-200 hover:border-gray-300 dark:border-dark-500 dark:hover:border-dark-400",
                    )}
                  >
                    <o.Icon className={clsx("mt-0.5 size-5 shrink-0", o.tone === "error" ? "text-error" : "text-warning")} />
                    <span>
                      <span className="block text-sm font-semibold text-gray-800 dark:text-dark-50">{o.label}</span>
                      <span className="block text-tiny text-gray-500 dark:text-dark-300">{o.hint}</span>
                    </span>
                  </button>
                );
              })}
              <p className="col-span-2 flex items-start gap-1.5 text-xs text-gray-500 dark:text-dark-300">
                <TbAlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                Çek portföyden çıkar ve tutar cariye yeniden borç olarak yansır.
              </p>
            </div>
          )}

          {action !== "deposit" && action !== "withdraw" && (
            <Input label="Açıklama" placeholder="Opsiyonel" value={description} onChange={(e) => setDescription(e.target.value)} />
          )}

          <div className="flex justify-end gap-2 border-t border-gray-150 pt-4 dark:border-dark-600">
            <Button variant="outlined" onClick={onClose} disabled={busy} className="h-9">
              Vazgeç
            </Button>
            <Button
              color={action === "bounce" ? "error" : action === "withdraw" ? "warning" : "primary"}
              onClick={submit}
              disabled={busy}
              className="h-9 gap-1.5"
            >
              {busy ? (
                <GhostSpinner variant="soft" className="size-4 border-2" />
              ) : action === "deposit" ? (
                <TbBuildingBank className="size-4" />
              ) : action === "collect" || action === "pay" ? (
                <TbCash className="size-4" />
              ) : (
                <TbCircleCheck className="size-4" />
              )}
              {TITLES[action]}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
