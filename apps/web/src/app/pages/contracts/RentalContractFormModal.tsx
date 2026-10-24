import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { TbCar, TbKey, TbReceipt } from "react-icons/tb";

import { Button, Input, NumericInput, Select, Spinner } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type { Account } from "@/@types/account";
import type { Vehicle } from "@/@types/vehicle";
import { listAccounts } from "@/services/accountService";
import { listVehicles } from "@/services/vehicleService";
import {
  createRentalContract,
  getRentalContract,
  updateRentalContract,
} from "@/services/contractService";
import {
  RENTAL_STATUS_LABELS,
  type RentalContractStatus,
} from "@/@types/contract";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingContractId?: string;
  initialVehicleId?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function RentalContractFormModal({
  open,
  onClose,
  onSaved,
  editingContractId,
  initialVehicleId,
}: Props) {
  const isEditing = !!editingContractId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Müşteri & Araç Kaynakları
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Form Alanları
  const [vehicleId, setVehicleId] = useState(initialVehicleId || "");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerTcTaxNo, setCustomerTcTaxNo] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [documentNo, setDocumentNo] = useState("");
  const [contractDate, setContractDate] = useState(today());
  const [startDate, setStartDate] = useState(today());
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [kmLimit, setKmLimit] = useState<number>(20000);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(20);
  const [status, setStatus] = useState<RentalContractStatus>("DRAFT");

  // Sürücüler
  const [drivers, setDrivers] = useState<string[]>([]);
  const [newDriver, setNewDriver] = useState("");

  // Bitiş Tarihi Otomatik Hesaplama
  const calculatedEndDate = useMemo(() => {
    if (!startDate || !durationMonths) return today();
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + Number(durationMonths));
    return d.toISOString().slice(0, 10);
  }, [startDate, durationMonths]);

  // Kaynakları Yükle
  useEffect(() => {
    if (!open) return;
    Promise.all([
      listAccounts({ pageSize: 300 }),
      listVehicles({ pageSize: 300 }),
    ]).then(([accRes, vehRes]) => {
      setAccounts(accRes.items);
      setVehicles(vehRes.items);
    }).catch(() => void 0);
  }, [open]);

  // Düzenleme Verisini Yükle
  useEffect(() => {
    if (!open) return;
    if (editingContractId) {
      setLoading(true);
      getRentalContract(editingContractId)
        .then((c) => {
          setVehicleId(c.vehicleId);
          setCustomerId(c.customerId || "");
          setCustomerName(c.customerName || "");
          setCustomerTcTaxNo(c.customerTcTaxNo || "");
          setCustomerPhone(c.customerPhone || "");
          setCustomerAddress(c.customerAddress || "");

          setDocumentNo(c.documentNo || "");
          setContractDate(c.contractDate ? c.contractDate.slice(0, 10) : today());
          setStartDate(c.startDate ? c.startDate.slice(0, 10) : today());
          setDurationMonths(Number(c.durationMonths) || 12);
          setKmLimit(Number(c.kmLimit) || 0);
          setMonthlyPrice(Number(c.monthlyPrice) || 0);
          setVatRate(Number(c.vatRate) || 20);
          setStatus(c.status);

          if (Array.isArray(c.drivers)) {
            setDrivers(c.drivers);
          } else {
            setDrivers([]);
          }
        })
        .catch(() => toast.error("Kira sözleşmesi detayları yüklenemedi"))
        .finally(() => setLoading(false));
    } else {
      setVehicleId(initialVehicleId || "");
      setCustomerId("");
      setCustomerName("");
      setCustomerTcTaxNo("");
      setCustomerPhone("");
      setCustomerAddress("");
      setDocumentNo(`KIRA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setContractDate(today());
      setStartDate(today());
      setDurationMonths(12);
      setKmLimit(20000);
      setMonthlyPrice(0);
      setVatRate(20);
      setStatus("DRAFT");
      setDrivers([]);
      setNewDriver("");
    }
  }, [open, editingContractId, initialVehicleId]);

  // Müşteri seçildiğinde otomatik doldur
  const handleAccountSelect = (accId: string) => {
    setCustomerId(accId);
    const acc = accounts.find((a) => a.id === accId);
    if (acc) {
      setCustomerName(acc.name);
      setCustomerTcTaxNo(acc.taxNumber || acc.tckn || "");
      setCustomerPhone(acc.phone || "");
      setCustomerAddress(acc.address || "");
    }
  };

  // Sürücü Ekle / Kaldır
  const addDriver = () => {
    if (!newDriver.trim()) return;
    setDrivers((prev) => [...prev, newDriver.trim()]);
    setNewDriver("");
  };

  const removeDriver = (index: number) => {
    setDrivers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      toast.error("Lütfen bir araç seçin");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Lütfen müşteri adı / unvanı girin");
      return;
    }
    if (monthlyPrice <= 0) {
      toast.error("Lütfen geçerli bir aylık kira bedeli girin");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        vehicleId,
        customerId: customerId || undefined,
        customerName: customerName.trim(),
        customerTcTaxNo: customerTcTaxNo.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        documentNo: documentNo.trim() || undefined,
        contractDate,
        startDate,
        endDate: calculatedEndDate,
        durationMonths: Number(durationMonths) || 12,
        kmLimit: Number(kmLimit) || 0,
        monthlyPrice: Number(monthlyPrice),
        vatRate: Number(vatRate) || 20,
        currency: "TRY",
        drivers,
        status,
      };

      if (isEditing) {
        await updateRentalContract(editingContractId, payload);
        toast.success("Kira sözleşmesi güncellendi");
      } else {
        await createRentalContract(payload);
        toast.success("Kira sözleşmesi oluşturuldu");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Kaydetme başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Kira Sözleşmesi Düzenle — ${documentNo}` : "Yeni Araç Kiralama Sözleşmesi"}
      className="max-w-3xl"
    >
      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="size-9 text-primary-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. ARAÇ & MÜŞTERİ SEÇİMİ */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-2 dark:border-dark-700">
              <TbCar className="size-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800 dark:text-dark-50">Araç ve Kiracı Bilgileri</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Kiralanacak Araç *
                </label>
                <SearchableSelect
                  options={vehicles.map((v) => ({
                    value: v.id,
                    label: `${v.plate} — ${v.brandName || ""} ${v.modelName || ""} (${v.year || ""})`,
                    sublabel: `Şasi: ${v.chassisNo || "—"}`,
                  }))}
                  value={vehicleId}
                  onChange={setVehicleId}
                  placeholder="Araç seçin..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Kayıtlı Cari Seç (Otomatik Doldurur)
                </label>
                <SearchableSelect
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: a.name,
                    sublabel: a.taxNumber ? `VKN: ${a.taxNumber}` : a.tckn ? `TCKN: ${a.tckn}` : "",
                  }))}
                  value={customerId}
                  onChange={handleAccountSelect}
                  placeholder="Cari hesaptan seçin..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Kiracı Adı / Unvanı *
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Kiracı adı veya şirket unvanı"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  TCKN / Vergi No
                </label>
                <Input
                  value={customerTcTaxNo}
                  onChange={(e) => setCustomerTcTaxNo(e.target.value)}
                  placeholder="TCKN veya VKN"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Telefon
                </label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="05XX XXX XX XX"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Adres
                </label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Kiracı tebligat adresi"
                />
              </div>
            </div>
          </div>

          {/* 2. SÖZLEŞME VE KİRA ŞARTLARI */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-2 dark:border-dark-700">
              <TbReceipt className="size-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800 dark:text-dark-50">Kiralama Şartları ve Bedel</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Sözleşme No
                </label>
                <Input
                  value={documentNo}
                  onChange={(e) => setDocumentNo(e.target.value)}
                  placeholder="KIRA-2026-..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Sözleşme Tarihi
                </label>
                <Input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Teslim / Başlangıç Tarihi
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Süre (Ay)
                </label>
                <NumericInput
                  value={durationMonths}
                  onValueChange={(v) => setDurationMonths(v || 12)}
                  numeralDecimalScale={0}
                  suffix=" Ay"
                  placeholder="12"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  KM Sınırı
                </label>
                <NumericInput
                  value={kmLimit}
                  onValueChange={(v) => setKmLimit(v || 0)}
                  numeralDecimalScale={0}
                  suffix=" KM"
                  placeholder="20000"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Durum
                </label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RentalContractStatus)}
                >
                  {Object.entries(RENTAL_STATUS_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Aylık Net Kira Bedeli (₺) *
                </label>
                <NumericInput
                  value={monthlyPrice}
                  onValueChange={(val) => setMonthlyPrice(val || 0)}
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  KDV Oranı (%)
                </label>
                <NumericInput
                  value={vatRate}
                  onValueChange={(val) => setVatRate(val || 20)}
                  suffix="%"
                  placeholder="20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Hesaplanan Bitiş Tarihi
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-200">
                  {new Date(calculatedEndDate).toLocaleDateString("tr-TR")}
                </div>
              </div>
            </div>
          </div>

          {/* 3. YETKİLİ SÜRÜCÜLER */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-2 dark:border-dark-700">
              <TbKey className="size-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800 dark:text-dark-50">Yetkili Sürücüler</h3>
            </div>

            <div className="flex gap-2">
              <Input
                value={newDriver}
                onChange={(e) => setNewDriver(e.target.value)}
                placeholder="Sürücü Adı Soyadı (TC / Ehliyet No)"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDriver();
                  }
                }}
              />
              <Button type="button" variant="outlined" onClick={addDriver} className="gap-1.5 shrink-0">
                <PlusIcon className="size-4" /> Ekle
              </Button>
            </div>

            {drivers.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {drivers.map((drv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-700 dark:bg-dark-700 dark:text-dark-200 border border-gray-150 dark:border-dark-600"
                  >
                    <span>
                      <b>{idx + 1}.</b> {drv}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDriver(idx)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BUTONLAR */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-dark-700">
            <Button variant="outlined" type="button" onClick={onClose} disabled={saving}>
              İptal
            </Button>
            <Button color="primary" type="submit" disabled={saving} className="gap-2">
              {saving && <Spinner className="size-4" />}
              {isEditing ? "Değişiklikleri Kaydet" : "Kira Sözleşmesini Oluştur"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
