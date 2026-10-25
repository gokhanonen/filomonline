import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Button, Input, NumericInput, Select } from "@/components/ui";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { listLocations } from "@/services/locationService";
import {
  createCashRegister,
  updateCashRegister,
} from "@/services/cashRegisterService";
import type { CashRegister, CashRegisterType } from "@/@types/cashRegister";
import type { Location } from "@/@types/location";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingRegister?: CashRegister | null;
}

const REGISTER_TYPES: { value: CashRegisterType; label: string }[] = [
  { value: "CASH", label: "Nakit Kasa" },
  { value: "BANK", label: "Banka Hesabı" },
  { value: "POS", label: "POS Cihazı / Terminal" },
];

export function CashRegisterModal({
  open,
  onClose,
  onSaved,
  editingRegister,
}: Props) {
  const isEditing = !!editingRegister;
  const [locations, setLocations] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<CashRegisterType>("CASH");
  const [currency, setCurrency] = useState("TRY");
  const [locationId, setLocationId] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [iban, setIban] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [erpCode, setErpCode] = useState("");

  useEffect(() => {
    if (!open) return;
    listLocations()
      .then((res) => setLocations(res.items))
      .catch(() => void 0);

    if (editingRegister) {
      setName(editingRegister.name || "");
      setType(editingRegister.type || "CASH");
      setCurrency(editingRegister.currency || "TRY");
      setLocationId(editingRegister.locationId || "");
      setBankName(editingRegister.bankName || "");
      setBranchName(editingRegister.branchName || "");
      setIban(editingRegister.iban || "");
      setAccountNumber(editingRegister.accountNumber || "");
      setOpeningBalance(Number(editingRegister.openingBalance || 0));
      setErpCode(editingRegister.erpCode || "");
    } else {
      setName("");
      setType("CASH");
      setCurrency("TRY");
      setLocationId("");
      setBankName("");
      setBranchName("");
      setIban("");
      setAccountNumber("");
      setOpeningBalance(0);
      setErpCode("");
    }
  }, [open, editingRegister]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Lütfen hesap / kasa adını girin.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        type,
        currency,
        locationId: locationId || undefined,
        bankName: bankName.trim() || undefined,
        branchName: branchName.trim() || undefined,
        iban: iban.trim().toUpperCase() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        openingBalance,
        erpCode: erpCode.trim() || undefined,
      };

      if (isEditing && editingRegister) {
        await updateCashRegister(editingRegister.id, payload);
        toast.success("Hesap bilgileri güncellendi.");
      } else {
        await createCashRegister(payload);
        toast.success("Yeni kasa/banka hesabı oluşturuldu.");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Hesabı Düzenle" : "Yeni Kasa / Banka Hesabı"}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hesap Tipi */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Hesap Türü
          </label>
          <div className="grid grid-cols-3 gap-2">
            {REGISTER_TYPES.map((rt) => {
              const active = type === rt.value;
              return (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setType(rt.value)}
                  className={`flex items-center justify-center rounded-lg border py-2.5 px-3 text-xs font-semibold transition-all ${
                    active
                      ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-400 dark:bg-primary-950/40 dark:text-primary-300"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-200"
                  }`}
                >
                  {rt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hesap Adı & Para Birimi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-dark-100 mb-1">
              Hesap / Kasa Adı <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "CASH" ? "Örn: Merkez Nakit Kasa" : type === "BANK" ? "Örn: Garanti BBVA Ticari Hesap" : "Örn: Garanti Ortak POS"}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-dark-100 mb-1">
              Para Birimi
            </label>
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="TRY">TRY (₺)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </Select>
          </div>
        </div>

        {/* Banka / POS Detayları */}
        {type !== "CASH" && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-3 dark:border-dark-600 dark:bg-dark-800/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
                  Banka Adı
                </label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Örn: Garanti BBVA, Akbank..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
                  Şube Adı / Kodu
                </label>
                <Input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Örn: İstoç Şubesi"
                />
              </div>
            </div>

            {type === "BANK" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
                    IBAN Numarası
                  </label>
                  <Input
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Hesap Numarası
                  </label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Örn: 1234567-89"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lokasyon & Açılış Bakiyesi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
              Bağlı Lokasyon (Şube)
            </label>
            <SearchableSelect
              options={locations.map((loc) => ({
                value: loc.id,
                label: loc.name,
                subLabel: loc.city || undefined,
              }))}
              value={locationId}
              onChange={setLocationId}
              placeholder="Lokasyon seçin (Opsiyonel)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
              Açılış Bakiyesi (₺)
            </label>
            <NumericInput
              value={openingBalance}
              onValueChange={(val) => setOpeningBalance(val || 0)}
              placeholder="0,00"
              suffix=" ₺"
              disabled={isEditing}
            />
            {isEditing && (
              <span className="text-[11px] text-gray-400">
                Açılış bakiyesi sadece ilk oluşturulurken girilebilir.
              </span>
            )}
          </div>
        </div>

        {/* ERP Kodu */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
            ERP / Muhasebe Kodu (Opsiyonel)
          </label>
          <Input
            value={erpCode}
            onChange={(e) => setErpCode(e.target.value)}
            placeholder="Örn: 100.01.001"
          />
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-dark-700">
          <Button type="button" variant="flat" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" color="primary" disabled={saving}>
            {saving ? "Kaydediliyor..." : isEditing ? "Güncelle" : "Hesabı Oluştur"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
