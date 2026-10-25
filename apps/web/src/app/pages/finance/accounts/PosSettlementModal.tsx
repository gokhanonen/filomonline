import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";

import { Button, Input, NumericInput } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type { FinanceAccount, FinanceMovement } from "@/@types/finance";
import { listMovements, settlePos } from "@/services/financeService";
import { errMsg, financeAccountOptions, fmtDate, fmtMoney, todayISO } from "../shared";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  pos: FinanceAccount | null;
  accounts: FinanceAccount[];
}

/** POS tahsilatlarını valör gününde bankaya aktarır (gerçek komisyon elle düzeltilebilir) */
export function PosSettlementModal({ open, onClose, onDone, pos, accounts }: Props) {
  const [items, setItems] = useState<FinanceMovement[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(todayISO());
  const [bankId, setBankId] = useState("");
  const [commission, setCommission] = useState<number | undefined>();
  const [commissionTouched, setCommissionTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !pos) return;
    setDate(todayISO());
    setBankId(pos.linkedBankId ?? "");
    setCommissionTouched(false);
    listMovements({ cashRegisterId: pos.id, unsettled: true, pageSize: 500 })
      .then((r) => {
        setItems(r.items);
        const today = todayISO();
        setSelected(new Set(r.items.filter((m) => !m.valueDate || m.valueDate.slice(0, 10) <= today).map((m) => m.id)));
      })
      .catch((err) => toast.error(errMsg(err)));
  }, [open, pos]);

  const gross = useMemo(
    () => Math.round(items.filter((m) => selected.has(m.id)).reduce((s, m) => s + m.amount, 0) * 100) / 100,
    [items, selected],
  );
  const autoCommission = Math.round(((gross * (pos?.commissionRate ?? 0)) / 100) * 100) / 100;
  const effectiveCommission = commissionTouched ? commission ?? 0 : autoCommission;
  const net = Math.round((gross - effectiveCommission) * 100) / 100;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = async () => {
    if (!pos || !selected.size) return toast.error("Aktarılacak tahsilat seçiniz");
    setSaving(true);
    try {
      const r = await settlePos({
        posId: pos.id,
        movementIds: [...selected],
        date,
        bankId: bankId || undefined,
        commission: commissionTouched ? commission ?? 0 : undefined,
      });
      toast.success(`Bankaya ${fmtMoney(r.net, pos.currency)} aktarıldı (komisyon ${fmtMoney(r.commission, pos.currency)})`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const bankOptions = financeAccountOptions(accounts, ["BANK"]);
  const cur = pos?.currency ?? "TRY";

  return (
    <Modal open={open} onClose={onClose} title={`Bankaya Aktar · ${pos?.name ?? ""}`} className="max-w-3xl">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Aktarım Tarihi" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="sm:col-span-2">
            <SearchableSelect label="Banka Hesabı" options={bankOptions} value={bankId} onChange={setBankId} placeholder="Banka seç..." />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-dark-500">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 text-sm dark:border-dark-500">
            <span className="font-semibold text-gray-800 dark:text-dark-50">Bekleyen POS Tahsilatları ({items.length})</span>
            <button
              type="button"
              className="text-xs font-semibold text-primary-600 hover:underline"
              onClick={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map((m) => m.id)))}
            >
              {selected.size === items.length ? "Hiçbirini seçme" : "Tümünü seç"}
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">Bekleyen POS tahsilatı yok.</p>
          ) : (
            <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto dark:divide-dark-600">
              {items.map((m) => {
                const due = !m.valueDate || m.valueDate.slice(0, 10) <= todayISO();
                return (
                  <label key={m.id} className={clsx("flex cursor-pointer items-center gap-3 px-4 py-2.5", selected.has(m.id) && "bg-primary-500/5")}>
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="size-4 accent-primary-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-700 dark:text-dark-100">{m.account?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">
                        {fmtDate(m.date)} · Valör{" "}
                        <span className={due ? "font-semibold text-success" : "text-warning"}>{fmtDate(m.valueDate)}</span>
                        {m.documentNo ? ` · ${m.documentNo}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">{fmtMoney(m.amount, m.currency)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-4 rounded-xl bg-gray-50 p-4 dark:bg-dark-800 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-400">Brüt</p>
            <p className="text-lg font-bold text-gray-800 dark:text-dark-50">{fmtMoney(gross, cur)}</p>
          </div>
          <NumericInput
            label={`Komisyon (oran %${pos?.commissionRate ?? 0})`}
            value={commissionTouched ? commission ?? null : autoCommission}
            onValueChange={(v) => {
              setCommissionTouched(true);
              setCommission(v);
            }}
            suffix="₺"
          />
          <div>
            <p className="text-xs text-gray-400">Bankaya Geçecek Net</p>
            <p className="text-lg font-bold text-success">{fmtMoney(net, cur)}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-150 pt-4 dark:border-dark-500">
          <Button variant="flat" onClick={onClose}>
            Vazgeç
          </Button>
          <Button color="primary" onClick={submit} disabled={saving || !selected.size}>
            {saving ? "Aktarılıyor..." : `${selected.size} tahsilatı aktar`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
