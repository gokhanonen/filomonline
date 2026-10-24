import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClockIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { TbTag } from "react-icons/tb";

import { Button, Input, NumericInput, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import type { Account } from "@/@types/account";
import { OPTION_STATUS_LABELS, type Vehicle, type VehicleOption } from "@/@types/vehicle";
import { listAccounts } from "@/services/accountService";
import {
  cancelOption,
  createOption,
  getActiveOption,
  listOptions,
  updateOption,
} from "@/services/vehicleService";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  /** Aktif opsiyon değişince (kartı tazelemek için) */
  onChanged?: (active: VehicleOption | null) => void;
}

const STATUS_COLOR: Record<VehicleOption["status"], string> = {
  ACTIVE: "text-success",
  EXPIRED: "text-warning",
  CANCELLED: "text-error",
  CONVERTED: "text-primary-600 dark:text-primary-400",
  SUPERSEDED: "text-gray-400",
};

const toDateInput = (iso: string) => iso.slice(0, 10);
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("tr-TR") : "—");
const fmtMoney = (v: string | number) =>
  "₺" + Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 0 });

/** Araca opsiyon (kapora / rezervasyon) koyma, güncelleme, iptal ve geçmiş. */
export function VehicleOptionModal({ open, onClose, vehicle, onChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<VehicleOption | null>(null);
  const [customers, setCustomers] = useState<Account[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [note, setNote] = useState("");

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<VehicleOption[] | null>(null);

  useEffect(() => {
    if (!open || !vehicle) return;
    setShowHistory(false);
    setHistory(null);
    setLoading(true);
    Promise.all([
      getActiveOption(vehicle.id),
      listAccounts({ type: "CUSTOMER", onlyActive: true, pageSize: 300 }),
    ])
      .then(([opt, acc]) => {
        setActive(opt);
        setCustomers(acc.items);
        setCustomerId(opt?.customerId ?? "");
        setValidUntil(opt ? toDateInput(opt.validUntil) : "");
        setAmount(opt ? Number(opt.amount) : "");
        setNote(opt?.note ?? "");
      })
      .catch(() => toast.error("Opsiyon bilgisi yüklenemedi"))
      .finally(() => setLoading(false));
  }, [open, vehicle]);

  const toggleHistory = async () => {
    if (!showHistory && history === null && vehicle) {
      try {
        setHistory(await listOptions(vehicle.id));
      } catch {
        setHistory([]);
      }
    }
    setShowHistory((s) => !s);
  };

  const submit = async () => {
    if (!vehicle) return;
    if (!customerId || !validUntil || amount === "" || Number(amount) < 0) {
      toast.error("Müşteri, geçerlilik tarihi ve tutar zorunlu");
      return;
    }
    setSaving(true);
    try {
      const payload = { customerId, validUntil, amount: Number(amount), note: note || undefined };
      const saved = active
        ? await updateOption(vehicle.id, active.id, payload)
        : await createOption(vehicle.id, payload);
      toast.success(active ? "Opsiyon güncellendi" : "Opsiyon eklendi");
      onChanged?.(saved);
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!vehicle || !active) return;
    if (!window.confirm("Aktif opsiyon iptal edilsin mi?")) return;
    setSaving(true);
    try {
      await cancelOption(vehicle.id, active.id);
      toast.success("Opsiyon iptal edildi");
      onChanged?.(null);
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İptal edilemedi");
    } finally {
      setSaving(false);
    }
  };

  const customerOpts = [
    { value: "", label: "Müşteri seç" },
    ...customers.map((c) => ({
      value: c.id,
      label: c.isPotential ? `${c.name} (potansiyel)` : c.name,
    })),
  ];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <TbTag className="size-5 text-amber-500" />
          {active ? "Opsiyonu Düzenle" : "Opsiyon Ekle"}
          {vehicle && <span className="text-sm font-normal text-gray-400">— {vehicle.plate}</span>}
        </span>
      }
      className="max-w-lg"
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">Yükleniyor...</p>
      ) : (
        <div className="space-y-4">
          {active && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Aktif Opsiyon
              </p>
              <p className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
                {active.customerName ?? "—"} • {fmtMoney(active.amount)}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {fmtDate(active.optionDate)} → {fmtDate(active.validUntil)} tarihine kadar geçerli
              </p>
            </div>
          )}

          <Select label="Müşteri *" data={customerOpts} value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Geçerlilik Tarihi *" type="date" min={today} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            <NumericInput
              label="Opsiyon Tutarı (₺) *"
              placeholder="0"
              value={amount}
              onValueChange={(val) => setAmount(val !== undefined ? val : "")}
            />
          </div>
          <Textarea label="Not" rows={2} value={note} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)} placeholder="Opsiyonla ilgili notlar..." />

          {/* Geçmiş */}
          <button
            type="button"
            onClick={toggleHistory}
            className="flex w-full items-center justify-center gap-1 border-t border-gray-200 pt-3 text-xs text-gray-500 hover:text-primary-600 dark:border-dark-500 dark:text-dark-300"
          >
            <ClockIcon className="size-4" /> Opsiyon Geçmişi
            {showHistory ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
          </button>
          {showHistory && (
            <div className="max-h-52 space-y-2 overflow-y-auto">
              {history === null && <p className="py-2 text-center text-xs text-gray-400">Yükleniyor...</p>}
              {history?.length === 0 && <p className="py-2 text-center text-xs text-gray-400">Geçmiş yok.</p>}
              {history?.map((o) => (
                <div key={o.id} className="rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-dark-600">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${STATUS_COLOR[o.status]}`}>{OPTION_STATUS_LABELS[o.status]}</span>
                    <span className="text-gray-400">
                      {fmtDate(o.optionDate)} → {fmtDate(o.validUntil)}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-600 dark:text-dark-200">
                    <span className="font-medium">{o.customerName ?? "—"}</span> • {fmtMoney(o.amount)}
                  </div>
                  {o.note && <div className="mt-1 border-t border-gray-200 pt-1 italic text-gray-400 dark:border-dark-500">{o.note}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            {active && (
              <Button color="error" variant="soft" onClick={cancel} disabled={saving}>
                İptal Et
              </Button>
            )}
            <Button variant="outlined" onClick={onClose}>Vazgeç</Button>
            <Button color="primary" onClick={submit} disabled={saving}>
              {saving ? "Kaydediliyor..." : active ? "Güncelle" : "Opsiyon Ekle"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
