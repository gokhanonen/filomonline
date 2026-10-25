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

/** Ay ekleme yardımcı fonksiyonu (Ay sonu gün taşmalarını önler) */
function addMonths(dateStr: string, monthsToAdd: number): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;

  const targetMonthIndex = m - 1 + monthsToAdd;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(d, maxDays);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

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
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState<SalesContractStatus>("DRAFT");

  const [price, setPrice] = useState(0); // Satış Bedeli
  const [notarySalePrice, setNotarySalePrice] = useState(0);
  const [vatRate, setVatRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [penaltyClause, setPenaltyClause] = useState(0);
  const [notes, setNotes] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Taksitler & Hızlı Oluşturma
  const [quickCount, setQuickCount] = useState<number | "">("");
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
          setDeliveryDate(c.deliveryDate ? c.deliveryDate.slice(0, 10) : "");
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
    let nextDate: string;
    if (installments.length > 0) {
      const lastDate = installments[installments.length - 1].date;
      nextDate = addMonths(lastDate, 1);
    } else {
      nextDate = addMonths(contractDate || today(), 1);
    }
    const remaining = Math.max(0, Number((grandTotal - totalInstallments).toFixed(2)));
    setInstallments((prev) => [
      ...prev,
      { date: nextDate, amount: remaining, type: "SENET" },
    ]);
  };

  // Taksit Kaldır
  const removeInstallment = (index: number) => {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  };

  // Taksit Güncelle (İlk tarih değişirse sonrakileri otomatik öteler; ara taksitlerde manuel düzenlemeye izin verir)
  const updateInstallment = (
    index: number,
    field: "date" | "amount" | "type",
    val: any,
  ) => {
    if (index === 0 && field === "date" && val) {
      // 1. Taksit tarihi değiştiğinde sonraki taksitlerin tarihlerini otomatik güncelle
      setInstallments((prev) =>
        prev.map((inst, i) => {
          if (i === 0) return { ...inst, date: val };
          return { ...inst, date: addMonths(val, i) };
        }),
      );
      return;
    }

    // Diğer taksitler veya tutar/tür değişikliklerinde yalnızca ilgili satırı güncelle
    setInstallments((prev) =>
      prev.map((inst, i) => (i === index ? { ...inst, [field]: val } : inst)),
    );
  };

  // Hızlı Taksit / Ödeme Planı Oluştur
  const handleQuickGenerate = () => {
    const count = Number(quickCount);
    if (!count || count <= 0) {
      toast.error("Lütfen geçerli bir taksit sayısı girin");
      return;
    }

    const baseDate = contractDate ? addMonths(contractDate, 1) : addMonths(today(), 1);
    const totalToDivide = grandTotal > 0 ? grandTotal : 0;
    const baseAmount = count > 0 ? Math.floor((totalToDivide / count) * 100) / 100 : 0;
    const diff = count > 0 ? Number((totalToDivide - baseAmount * count).toFixed(2)) : 0;

    const newInsts = Array.from({ length: count }, (_, idx) => ({
      date: addMonths(baseDate, idx),
      amount: idx === 0 ? Number((baseAmount + diff).toFixed(2)) : baseAmount,
      type: "SENET",
    }));

    setInstallments(newInsts);
    toast.success(`${count} taksitlik ödeme planı oluşturuldu.`);
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
        deliveryDate: deliveryDate || undefined,
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
                  Araç Teslim Tarihi
                </label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
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

          {/* 4. TAKSİT VE SENET PLANI (ÖDEME PLANI) */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-gray-150 pb-3 dark:border-dark-700">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="size-5 text-primary-600" />
                  <h3 className="font-bold tracking-tight text-gray-800 dark:text-dark-50">
                    ÖDEME PLANI
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">
                  İlk taksit tarihi değişirse sonrakiler otomatik güncellenir; ara tarihler manuel revize edilebilir.
                </p>
              </div>

              {/* Taksit Sayısı & Hızlı Oluştur */}
              <div className="flex items-center gap-2">
                <div className="w-28">
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Taksit Sayısı
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={quickCount}
                    onChange={(e) =>
                      setQuickCount(e.target.value ? parseInt(e.target.value, 10) : "")
                    }
                    placeholder="Örn: 5"
                    className="text-xs h-9 font-medium"
                  />
                </div>
                <Button
                  type="button"
                  variant="outlined"
                  className="h-9 text-xs font-semibold px-3 mt-auto whitespace-nowrap bg-gray-50 hover:bg-gray-100 dark:bg-dark-700 dark:hover:bg-dark-600"
                  onClick={handleQuickGenerate}
                >
                  Hızlı Oluştur
                </Button>
              </div>
            </div>

            {installments.length === 0 ? (
              <p className="text-xs italic text-gray-400 dark:text-dark-300 py-4 text-center">
                Henüz taksit veya senet eklenmedi (Taksit sayısı girip Hızlı Oluştur'a tıklayabilir veya Taksit Ekle butonuyla manuel ekleyebilirsiniz).
              </p>
            ) : (
              <div className="space-y-2">
                {/* Tablo Başlıkları */}
                <div className="grid grid-cols-12 gap-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-dark-400 border-b border-gray-100 dark:border-dark-700">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-4">TARİH</div>
                  <div className="col-span-4">TUTAR</div>
                  <div className="col-span-2">TÜR</div>
                  <div className="col-span-1 text-right"></div>
                </div>

                {/* Satırlar */}
                {installments.map((inst, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-center gap-2 rounded-lg border border-gray-150 bg-gray-50/70 p-2 dark:border-dark-700 dark:bg-dark-700/40"
                  >
                    <div className="col-span-1 text-center font-mono text-xs font-bold text-gray-500 dark:text-dark-300">
                      {idx + 1}
                    </div>

                    <div className="col-span-4">
                      <Input
                        type="date"
                        value={inst.date}
                        onChange={(e) => updateInstallment(idx, "date", e.target.value)}
                        className="text-xs h-9"
                        title={
                          idx === 0
                            ? "İlk taksit tarihi (değiştirilirse sonraki tüm taksitler otomatik 1'er ay ötelenir)"
                            : "Taksit vadesi"
                        }
                      />
                    </div>

                    <div className="col-span-4">
                      <NumericInput
                        value={inst.amount}
                        onValueChange={(val) => updateInstallment(idx, "amount", val || 0)}
                        placeholder="0,00"
                        className="h-9 font-medium"
                      />
                    </div>

                    <div className="col-span-2">
                      <Select
                        value={inst.type}
                        onChange={(e) => updateInstallment(idx, "type", e.target.value)}
                        className="text-xs h-9 font-medium"
                      >
                        <option value="SENET">Senet</option>
                        <option value="HAVALE">Havale</option>
                        <option value="KREDİ KARTI">Kredi Kartı</option>
                        <option value="ÇEK">Çek</option>
                        <option value="NAKİT">Nakit</option>
                      </Select>
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeInstallment(idx)}
                        className="text-gray-400 hover:text-rose-500 p-1.5 transition rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Taksiti Sil"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Alt Aksiyonlar & Toplam */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outlined"
                    className="gap-1.5 py-1.5 px-3 text-xs font-semibold"
                    onClick={addInstallment}
                  >
                    <PlusIcon className="size-4" /> Taksit Ekle
                  </Button>

                  <div className="text-xs text-gray-600 dark:text-dark-300">
                    Taksitler Toplamı:{" "}
                    <span className="font-mono font-bold text-gray-900 dark:text-dark-50 text-sm">
                      {fmtMoney(totalInstallments)}
                    </span>
                  </div>
                </div>
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
