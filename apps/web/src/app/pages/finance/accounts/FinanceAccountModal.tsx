import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";

import { Button, Input, NumericInput, Switch } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type { Currency, FinanceAccount, FinanceAccountPayload, FinanceAccountType } from "@/@types/finance";
import type { Location } from "@/@types/location";
import { createFinanceAccount, updateFinanceAccount } from "@/services/financeService";
import { listLocations } from "@/services/locationService";
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPE_META, CURRENCIES, errMsg, financeAccountOptions } from "../shared";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  account: FinanceAccount | null;
  accounts: FinanceAccount[];
  defaultType?: FinanceAccountType;
}

const TYPES: FinanceAccountType[] = ["CASH", "BANK", "POS", "CREDIT_CARD"];

const empty = (type: FinanceAccountType): FinanceAccountPayload => ({
  type,
  name: "",
  currency: "TRY",
  openingBalance: 0,
  isActive: true,
});

export function FinanceAccountModal({ open, onClose, onSaved, account, accounts, defaultType = "CASH" }: Props) {
  const [f, setF] = useState<FinanceAccountPayload>(empty(defaultType));
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const set = <K extends keyof FinanceAccountPayload>(k: K, v: FinanceAccountPayload[K]) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF(account ? { ...account } : empty(defaultType));
    listLocations({ onlyActive: true, pageSize: 200 }).then((r) => setLocations(r.items)).catch(() => void 0);
  }, [open, account, defaultType]);

  const type = f.type ?? "CASH";
  const isEdit = Boolean(account);
  const bankOptions = useMemo(
    () => financeAccountOptions(accounts, ["BANK"]).filter((o) => o.value !== account?.id),
    [accounts, account],
  );
  const locationOptions = useMemo(() => locations.map((l) => ({ value: l.id, label: l.name })), [locations]);

  const submit = async () => {
    if (!f.name?.trim()) return toast.error("Hesap adı giriniz");
    if ((type === "POS" || type === "CREDIT_CARD") && !f.linkedBankId) {
      return toast.error(type === "POS" ? "POS'un yatacağı banka hesabını seçiniz" : "Kartın ödeneceği banka hesabını seçiniz");
    }
    const payload: FinanceAccountPayload = {
      name: f.name.trim(),
      locationId: f.locationId || undefined,
      erpCode: f.erpCode || undefined,
      bankName: f.bankName || undefined,
      branchName: f.branchName || undefined,
      iban: f.iban || undefined,
      accountNumber: f.accountNumber || undefined,
      openingBalance: f.openingBalance ?? 0,
      linkedBankId: f.linkedBankId || undefined,
      isActive: f.isActive,
      ...(type === "POS" ? { commissionRate: f.commissionRate ?? 0, valorDays: f.valorDays ?? 0 } : {}),
      ...(type === "CREDIT_CARD"
        ? {
            cardLastFour: f.cardLastFour || undefined,
            creditLimit: f.creditLimit ?? undefined,
            statementDay: f.statementDay ?? undefined,
            paymentDueDay: f.paymentDueDay ?? undefined,
          }
        : {}),
    };
    setSaving(true);
    try {
      if (isEdit) await updateFinanceAccount(account!.id, payload);
      else await createFinanceAccount({ ...payload, type, currency: f.currency });
      toast.success(isEdit ? "Hesap güncellendi" : "Hesap oluşturuldu");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const opening = f.openingBalance ?? 0;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `${ACCOUNT_TYPE_LABEL[type]} Düzenle` : "Yeni Finans Hesabı"} className="max-w-2xl">
      <div className="space-y-4">
        {!isEdit && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPES.map((t) => {
              const { Icon, gradient } = ACCOUNT_TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition",
                    type === t ? "border-primary-500 ring-2 ring-primary-500/20" : "border-gray-200 text-gray-500 dark:border-dark-500",
                  )}
                >
                  <span className={clsx("flex size-9 items-center justify-center rounded-lg bg-linear-to-br text-white", gradient)}>
                    <Icon className="size-5" />
                  </span>
                  {ACCOUNT_TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Input
            label="Hesap Adı *"
            placeholder={type === "CASH" ? "Merkez Kasa" : type === "BANK" ? "Garanti TL Ticari" : type === "POS" ? "Garanti POS" : "Bonus Business 1"}
            value={f.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-dark-100">Döviz</p>
            <div className="flex gap-1">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={isEdit}
                  onClick={() => set("currency", c as Currency)}
                  className={clsx(
                    "rounded-lg border px-2.5 py-2 text-xs font-bold disabled:opacity-60",
                    f.currency === c ? "border-primary-500 bg-primary-500/10 text-primary-600" : "border-gray-200 text-gray-500 dark:border-dark-500",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(type === "BANK" || type === "POS" || type === "CREDIT_CARD") && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Banka" placeholder="Garanti BBVA" value={f.bankName ?? ""} onChange={(e) => set("bankName", e.target.value)} />
            {type === "BANK" && <Input label="Şube" value={f.branchName ?? ""} onChange={(e) => set("branchName", e.target.value)} />}
            {type === "BANK" && <Input label="IBAN" placeholder="TR.." value={f.iban ?? ""} onChange={(e) => set("iban", e.target.value)} />}
            {type === "BANK" && <Input label="Hesap No" value={f.accountNumber ?? ""} onChange={(e) => set("accountNumber", e.target.value)} />}
            {type === "POS" && <Input label="Terminal / Üye İşyeri No" value={f.accountNumber ?? ""} onChange={(e) => set("accountNumber", e.target.value)} />}
          </div>
        )}

        {(type === "POS" || type === "CREDIT_CARD") && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect
              label={type === "POS" ? "Yatacağı Banka Hesabı *" : "Ödeneceği Banka Hesabı *"}
              placeholder="Banka hesabı seç..."
              options={bankOptions}
              value={f.linkedBankId ?? ""}
              onChange={(v) => set("linkedBankId", v)}
            />
            {type === "POS" ? (
              <div className="grid grid-cols-2 gap-3">
                <NumericInput label="Komisyon" value={f.commissionRate ?? null} onValueChange={(v) => set("commissionRate", v)} suffix="%" />
                <NumericInput label="Valör" value={f.valorDays ?? null} onValueChange={(v) => set("valorDays", v)} numeralDecimalScale={0} suffix="gün" />
              </div>
            ) : (
              <Input label="Kart Son 4 Hane" maxLength={4} value={f.cardLastFour ?? ""} onChange={(e) => set("cardLastFour", e.target.value.replace(/\D/g, ""))} />
            )}
          </div>
        )}

        {type === "CREDIT_CARD" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <NumericInput label="Kart Limiti" value={f.creditLimit ?? null} onValueChange={(v) => set("creditLimit", v)} />
            <NumericInput label="Hesap Kesim Günü" value={f.statementDay ?? null} onValueChange={(v) => set("statementDay", v)} numeralDecimalScale={0} suffix="" />
            <NumericInput label="Son Ödeme Günü" value={f.paymentDueDay ?? null} onValueChange={(v) => set("paymentDueDay", v)} numeralDecimalScale={0} suffix="" />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {type === "CREDIT_CARD" ? (
            <NumericInput
              label="Devreden Borç"
              value={opening ? -opening : null}
              onValueChange={(v) => set("openingBalance", v ? -v : 0)}
            />
          ) : type !== "POS" ? (
            <NumericInput label="Açılış Bakiyesi" value={opening || null} onValueChange={(v) => set("openingBalance", v ?? 0)} />
          ) : null}
          {type === "CASH" && (
            <SearchableSelect
              label="Lokasyon"
              placeholder="Lokasyon seç..."
              options={locationOptions}
              value={f.locationId ?? ""}
              onChange={(v) => set("locationId", v)}
              onClear={() => set("locationId", "")}
            />
          )}
          <Input label="ERP / Muhasebe Kodu" placeholder={type === "CASH" ? "100.01" : type === "BANK" ? "102.01" : type === "POS" ? "108.01" : "309.01"} value={f.erpCode ?? ""} onChange={(e) => set("erpCode", e.target.value)} />
        </div>

        {isEdit && (
          <Switch label="Aktif" checked={f.isActive ?? true} onChange={(e) => set("isActive", e.target.checked)} />
        )}

        <div className="flex justify-end gap-2 border-t border-gray-150 pt-4 dark:border-dark-500">
          <Button variant="flat" onClick={onClose}>
            Vazgeç
          </Button>
          <Button color="primary" onClick={submit} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
