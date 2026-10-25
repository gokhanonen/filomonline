import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Button, Input, NumericInput } from "@/components/ui";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { listAccounts } from "@/services/accountService";
import { listVehicles } from "@/services/vehicleService";
import { createCashTransaction } from "@/services/cashRegisterService";
import type {
  CashRegister,
  CashTransactionType,
} from "@/@types/cashRegister";
import type { Account } from "@/@types/account";
import type { Vehicle } from "@/@types/vehicle";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  registers: CashRegister[];
  defaultRegisterId?: string;
  defaultType?: CashTransactionType;
}

const today = () => new Date().toISOString().slice(0, 10);

export function CashTransactionModal({
  open,
  onClose,
  onSaved,
  registers,
  defaultRegisterId,
  defaultType = "COLLECTION",
}: Props) {
  const [type, setType] = useState<CashTransactionType>(defaultType);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [targetRegisterId, setTargetRegisterId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(today());
  const [documentNo, setDocumentNo] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!open) return;
    setType(defaultType);
    setCashRegisterId(defaultRegisterId || registers[0]?.id || "");
    setTargetRegisterId(
      registers.find((r) => r.id !== (defaultRegisterId || registers[0]?.id))?.id || "",
    );
    setAccountId("");
    setVehicleId("");
    setAmount(0);
    setDate(today());
    setDocumentNo("");
    setDescription("");

    listAccounts({ onlyActive: true, pageSize: 300 })
      .then((res) => setAccounts(res.items))
      .catch(() => void 0);

    listVehicles({ pageSize: 300 })
      .then((res) => setVehicles(res.items))
      .catch(() => void 0);
  }, [open, defaultType, defaultRegisterId, registers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashRegisterId) {
      toast.error("Lütfen hesap / kasa seçin.");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Lütfen geçerli bir tutar girin.");
      return;
    }
    if (type === "TRANSFER" && (!targetRegisterId || targetRegisterId === cashRegisterId)) {
      toast.error("Virman için farklı bir hedef hesap seçmelisiniz.");
      return;
    }

    try {
      setSaving(true);
      await createCashTransaction({
        cashRegisterId,
        type,
        amount,
        date,
        documentNo: documentNo.trim() || undefined,
        description: description.trim() || undefined,
        accountId: type !== "TRANSFER" && accountId ? accountId : undefined,
        vehicleId: vehicleId || undefined,
        targetRegisterId: type === "TRANSFER" ? targetRegisterId : undefined,
      });

      toast.success(
        type === "COLLECTION"
          ? "Tahsilat kaydedildi."
          : type === "PAYMENT"
            ? "Tediye kaydedildi."
            : "Virman işlemi tamamlandı.",
      );

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "İşlem kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const activeReg = registers.find((r) => r.id === cashRegisterId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Finansal Hareket Ekle (Kasa / Banka)"
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* İşlem Türü Seçimi */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setType("COLLECTION")}
            className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition-all ${
              type === "COLLECTION"
                ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-200"
            }`}
          >
            <span className="text-sm">↓ Tahsilat</span>
            <span className="text-[10px] font-normal opacity-80">(Kasaya Giriş)</span>
          </button>

          <button
            type="button"
            onClick={() => setType("PAYMENT")}
            className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition-all ${
              type === "PAYMENT"
                ? "border-rose-500 bg-rose-50 text-rose-800 shadow-xs dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-200"
            }`}
          >
            <span className="text-sm">↑ Tediye</span>
            <span className="text-[10px] font-normal opacity-80">(Kasadan Çıkış)</span>
          </button>

          <button
            type="button"
            onClick={() => setType("TRANSFER")}
            className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition-all ${
              type === "TRANSFER"
                ? "border-indigo-500 bg-indigo-50 text-indigo-800 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-200"
            }`}
          >
            <span className="text-sm">⇄ Virman</span>
            <span className="text-[10px] font-normal opacity-80">(Hesaplar Arası)</span>
          </button>
        </div>

        {/* Hesap Seçimleri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-dark-100 mb-1">
              {type === "TRANSFER" ? "Kaynak Hesap (Çıkış)" : "İşlem Yapılacak Hesap"} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={registers.map((r) => ({
                value: r.id,
                label: r.name,
                subLabel: `${r.type} • Bakiye: ${Number(r.balance || 0).toLocaleString("tr-TR")} ₺`,
              }))}
              value={cashRegisterId}
              onChange={setCashRegisterId}
              placeholder="Hesap seçin"
            />
            {activeReg && (
              <span className="mt-1 block text-[11px] text-gray-500">
                Mevcut Bakiye: <b className="text-gray-800 dark:text-dark-100">{Number(activeReg.balance || 0).toLocaleString("tr-TR")} ₺</b>
              </span>
            )}
          </div>

          {type === "TRANSFER" ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-100 mb-1">
                Hedef Hesap (Giriş) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={registers
                  .filter((r) => r.id !== cashRegisterId)
                  .map((r) => ({
                    value: r.id,
                    label: r.name,
                    subLabel: `${r.type} • Bakiye: ${Number(r.balance || 0).toLocaleString("tr-TR")} ₺`,
                  }))}
                value={targetRegisterId}
                onChange={setTargetRegisterId}
                placeholder="Hedef hesap seçin"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-100 mb-1">
                İlişkili Cari (Müşteri / Tedarikçi)
              </label>
              <SearchableSelect
                options={accounts.map((acc) => ({
                  value: acc.id,
                  label: acc.name,
                  subLabel: `${acc.type === "CUSTOMER" ? "Müşteri" : "Tedarikçi"} • Bakiye: ${Number(acc.balance || 0).toLocaleString("tr-TR")} ₺`,
                }))}
                value={accountId}
                onChange={setAccountId}
                placeholder="Cari seçin (Opsiyonel)"
              />
            </div>
          )}
        </div>

        {/* Tutar & Tarih */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-dark-100 mb-1">
              İşlem Tutarı (₺) <span className="text-red-500">*</span>
            </label>
            <NumericInput
              value={amount}
              onValueChange={(val) => setAmount(val || 0)}
              placeholder="0,00"
              suffix=" ₺"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-dark-100 mb-1">
              İşlem Tarihi
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* İlgili Araç & Makbuz No */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
              İlgili Araç (Opsiyonel)
            </label>
            <SearchableSelect
              options={vehicles.map((v) => ({
                value: v.id,
                label: `${v.plate} — ${v.brandName} ${v.modelName}`,
              }))}
              value={vehicleId}
              onChange={setVehicleId}
              placeholder="Araç seçin (Opsiyonel)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
              Makbuz / Dekont No (Opsiyonel)
            </label>
            <Input
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              placeholder="Örn: DKT-2026-0045"
            />
          </div>
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
            İşlem Açıklaması
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Örn: Araç satış peşinatı / Kasko poliçe ödemesi"
          />
        </div>

        {/* Butonlar */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-dark-700">
          <Button type="button" variant="flat" onClick={onClose}>
            Vazgeç
          </Button>
          <Button
            type="submit"
            color="primary"
            disabled={saving}
            className={
              type === "COLLECTION"
                ? "!bg-emerald-600 hover:!bg-emerald-700 text-white"
                : type === "PAYMENT"
                  ? "!bg-rose-600 hover:!bg-rose-700 text-white"
                  : "!bg-indigo-600 hover:!bg-indigo-700 text-white"
            }
          >
            {saving
              ? "Kaydediliyor..."
              : type === "COLLECTION"
                ? "Tahsilatı Kaydet"
                : type === "PAYMENT"
                  ? "Tediyeyi Kaydet"
                  : "Virmanı Gerçekleştir"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
