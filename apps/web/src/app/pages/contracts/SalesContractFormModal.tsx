import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDaysIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { TbCar, TbReceipt } from "react-icons/tb";

import { Button, Input, NumericInput, Select, Spinner } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type { Account } from "@/@types/account";
import type { Vehicle } from "@/@types/vehicle";
import { listAccounts } from "@/services/accountService";
import { listVehicles } from "@/services/vehicleService";
import {
  createSalesContract,
  getSalesContract,
  updateSalesContract,
} from "@/services/contractService";
import {
  SALES_STATUS_LABELS,
  type SalesContractFormData,
  type SalesContractStatus,
} from "@/@types/contract";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingContractId?: string;
  initialVehicleId?: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n: number) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

export function SalesContractFormModal({
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
  const [customerTaxNumber, setCustomerTaxNumber] = useState("");
  const [customerIdentityNumber, setCustomerIdentityNumber] = useState("");
  const [customerTaxOffice, setCustomerTaxOffice] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [documentNo, setDocumentNo] = useState("");
  const [contractDate, setContractDate] = useState(today());
  const [validUntil, setValidUntil] = useState(today());
  const [status, setStatus] = useState<SalesContractStatus>("DRAFT");

  const [price, setPrice] = useState(0); // Satış Bedeli
  const [notarySalePrice, setNotarySalePrice] = useState(0);
  const [vatRate, setVatRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [penaltyClause, setPenaltyClause] = useState(0);
  const [notes, setNotes] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Taksitler
  const [installments, setInstallments] = useState<
    Array<{ date: string; amount: number; type: string }>
  >([]);

  // Veri Kaynaklarını Çek
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
      getSalesContract(editingContractId)
        .then((c) => {
          setVehicleId(c.vehicleId);
          setCustomerId(c.customerId || "");
          setCustomerName(c.customerName || "");
          setCustomerTaxNumber(c.customerTaxNumber || "");
          setCustomerIdentityNumber(c.customerIdentityNumber || "");
          setCustomerTaxOffice(c.customerTaxOffice || "");
          setCustomerPhone(c.customerPhone || "");
          setCustomerEmail(c.customerEmail || "");
          setCustomerAddress(c.customerAddress || "");

          setDocumentNo(c.documentNo || "");
          setContractDate(c.contractDate ? c.contractDate.slice(0, 10) : today());
          setValidUntil(c.validUntil ? c.validUntil.slice(0, 10) : today());
          setStatus(c.status);

          setPrice(Number(c.price) || 0);
          setNotarySalePrice(Number(c.notarySalePrice) || 0);
          setVatRate(Number(c.vatRate) || 0);
          setDiscount(Number(c.discount) || 0);
          setPenaltyClause(Number(c.penaltyClause) || 0);
          setNotes(c.notes || "");
          setPaymentNotes(c.paymentNotes || "");

          if (c.installments && c.installments.length > 0) {
            setInstallments(
              c.installments.map((i) => ({
                date: i.date ? i.date.slice(0, 10) : today(),
                amount: Number(i.amount) || 0,
                type: i.type || "SENET",
              })),
            );
          } else {
            setInstallments([]);
          }
        })
        .catch(() => toast.error("Sözleşme detayları yüklenemedi"))
        .finally(() => setLoading(false));
    } else {
      // Yeni Sözleşme
      setVehicleId(initialVehicleId || "");
      setCustomerId("");
      setCustomerName("");
      setCustomerTaxNumber("");
      setCustomerIdentityNumber("");
      setCustomerTaxOffice("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerAddress("");
      setDocumentNo(`SOZ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setContractDate(today());
      setValidUntil(today());
      setStatus("DRAFT");
      setPrice(0);
      setNotarySalePrice(0);
      setVatRate(0);
      setDiscount(0);
      setPenaltyClause(0);
      setNotes("");
      setPaymentNotes("");
      setInstallments([]);
    }
  }, [open, editingContractId, initialVehicleId]);

  // Seçilen Araç
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === vehicleId);
  }, [vehicles, vehicleId]);

  // Araç değiştiğinde fiyatı doldur
  useEffect(() => {
    if (!isEditing && selectedVehicle) {
      if (selectedVehicle.listPrice) {
        setPrice(Number(selectedVehicle.listPrice));
      } else if (selectedVehicle.saleAmount) {
        setPrice(Number(selectedVehicle.saleAmount));
      }
      if (selectedVehicle.saleNotaryAmount) {
        setNotarySalePrice(Number(selectedVehicle.saleNotaryAmount));
      }
    }
  }, [selectedVehicle, isEditing]);

  // Müşteri seçildiğinde otomatik alan doldurma
  const handleAccountSelect = (accId: string) => {
    setCustomerId(accId);
    const acc = accounts.find((a) => a.id === accId);
    if (acc) {
      setCustomerName(acc.name);
      setCustomerTaxNumber(acc.taxNumber || "");
      setCustomerIdentityNumber(acc.tckn || "");
      setCustomerTaxOffice(acc.taxOffice || "");
      setCustomerPhone(acc.phone || "");
      setCustomerEmail(acc.email || "");
      setCustomerAddress(acc.address || "");
    }
  };

  // Hesaplamalar
  const grandTotal = Math.max(0, price - discount);
  const totalInstallments = useMemo(() => {
    return installments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  }, [installments]);
  const downPayment = Math.max(0, grandTotal - totalInstallments);

  // Taksit Ekle
  const addInstallment = () => {
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + installments.length + 1);
    const dateStr = nextDate.toISOString().slice(0, 10);
    const remaining = Math.max(0, grandTotal - totalInstallments);
    setInstallments((prev) => [
      ...prev,
      { date: dateStr, amount: remaining, type: "SENET" },
    ]);
  };

  // Taksit Kaldır
  const removeInstallment = (index: number) => {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  };

  // Taksit Güncelle
  const updateInstallment = (
    index: number,
    field: "date" | "amount" | "type",
    val: any,
  ) => {
    setInstallments((prev) =>
      prev.map((inst, i) => (i === index ? { ...inst, [field]: val } : inst)),
    );
  };

  // Kaydet
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
    if (!documentNo.trim()) {
      toast.error("Lütfen sözleşme evrak numarası girin");
      return;
    }
    if (price <= 0) {
      toast.error("Lütfen geçerli bir satış bedeli girin");
      return;
    }

    setSaving(true);
    try {
      const payload: SalesContractFormData = {
        vehicleId,
        customerId: customerId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerTaxOffice: customerTaxOffice.trim() || undefined,
        customerTaxNumber: customerTaxNumber.trim() || undefined,
        customerIdentityNumber: customerIdentityNumber.trim() || undefined,
        documentNo: documentNo.trim(),
        contractDate,
        validUntil: validUntil || undefined,
        price,
        vatRate,
        discount,
        grandTotal,
        notarySalePrice: notarySalePrice || undefined,
        status,
        notes: notes.trim() || undefined,
        paymentNotes: paymentNotes.trim() || undefined,
        penaltyClause: penaltyClause || undefined,
        installments: installments.map((inst, idx) => ({
          date: inst.date,
          amount: inst.amount,
          type: inst.type,
          sortOrder: idx,
        })),
      };

      if (isEditing) {
        await updateSalesContract(editingContractId, payload);
        toast.success("Satış sözleşmesi güncellendi");
      } else {
        await createSalesContract(payload);
        toast.success("Satış sözleşmesi oluşturuldu");
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
      title={isEditing ? `Satış Sözleşmesi Düzenle — ${documentNo}` : "Yeni Araç Satış Sözleşmesi"}
      className="max-w-4xl"
    >
      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="size-9 text-primary-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ÜST ÖZET KARTLARI */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-dark-700 dark:bg-dark-800">
              <span className="text-xs font-semibold uppercase text-gray-500">Satış Bedeli</span>
              <div className="mt-1 text-lg font-bold text-gray-900 dark:text-dark-50">
                {fmtMoney(grandTotal)}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/20">
              <span className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                Peşinat / Kapora
              </span>
              <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {fmtMoney(downPayment)}
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-950 dark:bg-blue-950/20">
              <span className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">
                Kalan Taksit / Senet
              </span>
              <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                {fmtMoney(totalInstallments)}
              </div>
            </div>
          </div>

          {/* 1. ARAÇ SEÇİMİ */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-2 dark:border-dark-700">
              <TbCar className="size-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800 dark:text-dark-50">Satılacak Araç</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Araç Seçin *
                </label>
                <SearchableSelect
                  options={vehicles.map((v) => ({
                    value: v.id,
                    label: `${v.plate} — ${v.brandName || ""} ${v.modelName || ""} (${v.year || ""})`,
                    sublabel: `Şasi: ${v.chassisNo || "—"} • Alış: ₺${Number(v.purchasePrice || 0).toLocaleString("tr-TR")}`,
                  }))}
                  value={vehicleId}
                  onChange={setVehicleId}
                  placeholder="Plaka veya marka/model ile ara..."
                />
              </div>

              {selectedVehicle && (
                <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600 dark:bg-dark-700/60 dark:text-dark-200 flex flex-col justify-center">
                  <div className="flex justify-between font-medium">
                    <span>Plaka / Model:</span>
                    <span className="font-bold text-gray-900 dark:text-dark-50">{selectedVehicle.plate} — {selectedVehicle.brandName} {selectedVehicle.modelName}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Şasi No:</span>
                    <span className="font-mono">{selectedVehicle.chassisNo || "—"}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Motor No:</span>
                    <span className="font-mono">{selectedVehicle.engineNo || "—"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. ALICI / MÜŞTERİ BİLGİLERİ */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-2 dark:border-dark-700">
              <UserIcon className="size-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800 dark:text-dark-50">Alıcı (Müşteri) Bilgileri</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  Müşteri Adı / Ünvanı *
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Müşteri tam adı veya firma unvanı"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  TC Kimlik No
                </label>
                <Input
                  value={customerIdentityNumber}
                  onChange={(e) => setCustomerIdentityNumber(e.target.value)}
                  placeholder="11 haneli TCKN"
                  maxLength={11}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Vergi No / Dairesi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={customerTaxNumber}
                    onChange={(e) => setCustomerTaxNumber(e.target.value)}
                    placeholder="VKN (10 hane)"
                    maxLength={10}
                  />
                  <Input
                    value={customerTaxOffice}
                    onChange={(e) => setCustomerTaxOffice(e.target.value)}
                    placeholder="Vergi dairesi"
                  />
                </div>
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
                  E-Posta
                </label>
                <Input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="ornek@domain.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Adres
                </label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Tam açık adres..."
                />
              </div>
            </div>
          </div>

          {/* 3. SÖZLEŞME VE FİYAT ŞARTLARI */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-2 dark:border-dark-700">
              <TbReceipt className="size-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800 dark:text-dark-50">Sözleşme & Fiyat Detayları</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Sözleşme No *
                </label>
                <Input
                  value={documentNo}
                  onChange={(e) => setDocumentNo(e.target.value)}
                  placeholder="SOZ-2026-..."
                  required
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
                  Geçerlilik / Noter Son Tarihi
                </label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Durum
                </label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SalesContractStatus)}
                >
                  {Object.entries(SALES_STATUS_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Satış Bedeli (₺) *
                </label>
                <NumericInput
                  value={price}
                  onValueChange={(val) => setPrice(val || 0)}
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  İndirim Tutarı (₺)
                </label>
                <NumericInput
                  value={discount}
                  onValueChange={(val) => setDiscount(val || 0)}
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Noter Satış Fiyatı (₺)
                </label>
                <NumericInput
                  value={notarySalePrice}
                  onValueChange={(val) => setNotarySalePrice(val || 0)}
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                  Cezai Şart / Cayma Bedeli (₺)
                </label>
                <NumericInput
                  value={penaltyClause}
                  onValueChange={(val) => setPenaltyClause(val || 0)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          {/* 4. TAKSİT VE SENET PLANI */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-150 pb-2 dark:border-dark-700">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="size-5 text-primary-600" />
                <h3 className="font-semibold text-gray-800 dark:text-dark-50">Ödeme & Taksit Planı</h3>
              </div>
              <Button
                type="button"
                variant="outlined"
                className="gap-1.5 py-1 px-2.5 text-xs"
                onClick={addInstallment}
              >
                <PlusIcon className="size-4" /> Taksit Ekle
              </Button>
            </div>

            {installments.length === 0 ? (
              <p className="text-xs italic text-gray-400 dark:text-dark-300 py-3 text-center">
                Henüz taksit veya senet eklenmedi (Tamamı peşinat olarak kabul edilir).
              </p>
            ) : (
              <div className="space-y-2">
                {installments.map((inst, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-150 bg-gray-50/70 p-2.5 dark:border-dark-700 dark:bg-dark-700/40"
                  >
                    <span className="w-16 font-mono text-xs font-bold text-gray-600 dark:text-dark-300">
                      {idx + 1}. Taksit
                    </span>

                    <div className="w-36">
                      <Input
                        type="date"
                        value={inst.date}
                        onChange={(e) => updateInstallment(idx, "date", e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="w-40">
                      <NumericInput
                        value={inst.amount}
                        onValueChange={(val) => updateInstallment(idx, "amount", val || 0)}
                        placeholder="Tutar (₺)"
                      />
                    </div>

                    <div className="w-36">
                      <Select
                        value={inst.type}
                        onChange={(e) => updateInstallment(idx, "type", e.target.value)}
                        className="text-xs"
                      >
                        <option value="SENET">Senet</option>
                        <option value="HAVALE">Banka Havalesi</option>
                        <option value="KREDİ KARTI">Kredi Kartı</option>
                        <option value="ÇEK">Çek</option>
                        <option value="NAKİT">Nakit</option>
                      </Select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeInstallment(idx)}
                      className="ml-auto text-rose-500 hover:text-rose-700 p-1"
                      title="Taksiti Sil"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. NOTLAR */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                Sözleşme Notları
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Genel şartlar veya özel notlar..."
                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-800 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
                Ödeme Notları
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                placeholder="Banka hesap veya teslimat ödeme koşulları..."
                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-800 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-100"
              />
            </div>
          </div>

          {/* BUTONLAR */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-dark-700">
            <Button variant="outlined" type="button" onClick={onClose} disabled={saving}>
              İptal
            </Button>
            <Button color="primary" type="submit" disabled={saving} className="gap-2">
              {saving && <Spinner className="size-4" />}
              {isEditing ? "Değişiklikleri Kaydet" : "Sözleşmeyi Oluştur"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
