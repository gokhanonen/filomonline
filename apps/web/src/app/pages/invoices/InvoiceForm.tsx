import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, Checkbox, Input, NumericInput, Select } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type { Account } from "@/@types/account";
import {
  PURCHASE_REGIME_CONFIG,
  type PurchaseRegime,
  type Vehicle,
} from "@/@types/vehicle";
import { listAccounts } from "@/services/accountService";
import { listVehicles } from "@/services/vehicleService";
import {
  createPurchaseInvoice,
  createSalesInvoice,
} from "@/services/invoiceService";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialVehicleId?: string;
  initialType?: "purchase" | "sales";
}

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function InvoiceForm({ open, onClose, onSaved, initialVehicleId, initialType }: Props) {
  const [type, setType] = useState<"purchase" | "sales">("purchase");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);

  // Ortak
  const [vehicleId, setVehicleId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());

  // Alış Faturası
  const [notaryAmount, setNotaryAmount] = useState(0);
  const [otherAmount, setOtherAmount] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [specialBase, setSpecialBase] = useState(false);
  const [specialBaseAmount, setSpecialBaseAmount] = useState(0);

  // Satış Faturası
  const [saleAmount, setSaleAmount] = useState(0); // Satış Tutarı
  const [notarySalePrice, setNotarySalePrice] = useState(0); // Satış Noter Fiyatı

  useEffect(() => {
    if (!open) return;
    setType(initialType ?? "purchase");
    setVehicleId(initialVehicleId ?? "");
    setAccountId("");
    setInvoiceNo("");
    setInvoiceDate(today());
    setNotaryAmount(0);
    setOtherAmount(0);
    setVatRate(20);
    setSpecialBase(false);
    setSpecialBaseAmount(0);
    setSaleAmount(0);
    setNotarySalePrice(0);

    listVehicles({ pageSize: 300 }).then((r) => setVehicles(r.items)).catch(() => void 0);
  }, [open, initialVehicleId, initialType]);

  useEffect(() => {
    if (!open) return;
    const t = type === "purchase" ? "SUPPLIER" : "CUSTOMER";
    listAccounts({ type: t, onlyActive: true, pageSize: 300 }).then((r) => setAccounts(r.items)).catch(() => void 0);
  }, [open, type]);

  // Seçili araç ve alım rejimi
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId),
    [vehicles, vehicleId],
  );

  const vehicleRegime: PurchaseRegime = useMemo(() => {
    if (!selectedVehicle) return "sahis";
    if (selectedVehicle.purchaseRegime) return selectedVehicle.purchaseRegime;
    if (selectedVehicle.specialBase) return "galeri_ozel";
    const pVat = Number(selectedVehicle.purchaseVatRate);
    if (pVat === 1) return "sirket_1";
    if (pVat === 20) return "sirket_20";
    return "sahis";
  }, [selectedVehicle]);

  const regimeConfig = PURCHASE_REGIME_CONFIG[vehicleRegime] || PURCHASE_REGIME_CONFIG.sahis;
  const notaryPurchasePrice = Number(
    selectedVehicle?.purchaseNotaryPrice ?? selectedVehicle?.purchasePrice ?? 0,
  );

  // Araç değiştiğinde alış noter fiyatını ve varsayılanları güncelle
  useEffect(() => {
    if (selectedVehicle && type === "sales") {
      if (!saleAmount && selectedVehicle.listPrice) {
        setSaleAmount(Number(selectedVehicle.listPrice));
      }
      if (!notarySalePrice && selectedVehicle.tensf) {
        setNotarySalePrice(Number(selectedVehicle.tensf));
      } else if (!notarySalePrice && selectedVehicle.purchaseNotaryPrice) {
        setNotarySalePrice(Number(selectedVehicle.purchaseNotaryPrice));
      }
    }
  }, [selectedVehicle, type]);

  // Canlı Vergi ve Hesaplama Önizlemesi
  const calculation = useMemo(() => {
    if (type === "purchase") {
      if (specialBase) {
        const fee = specialBaseAmount * 0.2;
        return {
          rows: [
            ["Alış Özel Matrah Tutarı", specialBaseAmount],
            ["Hizmet Bedeli (%20 KDV Dahil)", fee],
            ["Toplam", notaryAmount + otherAmount + fee],
          ],
          vatAmount: fee,
          total: notaryAmount + otherAmount + fee,
        };
      }
      const base = notaryAmount + otherAmount;
      const vat = (base * vatRate) / 100;
      return {
        rows: [
          ["Matrah", base],
          [`KDV (%${vatRate})`, vat],
          ["Toplam", base + vat],
        ],
        vatAmount: vat,
        total: base + vat,
      };
    }

    // Satış Faturası Rejim Hesaplamaları
    if (vehicleRegime === "sahis") {
      // 1) Şahıstan Alım:
      // Kâr Marjı = Noter Satış - Noter Alış
      const karMarji = Math.max(0, notarySalePrice - notaryPurchasePrice);
      // Hizmet Matrahı = Kâr Marjı / 1.20
      const hizmetMatrahi = karMarji > 0 ? karMarji / 1.2 : 0;
      // Hizmet KDV (%20) = Kâr Marjı - Hizmet Matrahı
      const hizmetKdv = karMarji > 0 ? karMarji - hizmetMatrahi : 0;

      return {
        rows: [
          ["Satış Tutarı (Genel)", saleAmount || notarySalePrice],
          ["Noter Satış Fiyatı", notarySalePrice],
          ["Noter Alış Tutarı (-)", notaryPurchasePrice],
          ["Kâr Marjı", karMarji],
          ["Kâr Hizmet Matrahı", hizmetMatrahi],
          ["Hizmet KDV'si (%20)", hizmetKdv],
          ["Noter Satış / Fatura Tutarı", notarySalePrice],
        ],
        vatRate: 20,
        vatAmount: hizmetKdv,
        matrah: notaryPurchasePrice + hizmetMatrahi,
        total: notarySalePrice,
      };
    }

    if (vehicleRegime === "sirket_1" || vehicleRegime === "galeri_ozel") {
      // 2) Şirketten %1 veya 4) Galeriden Özel Matrahlı (%1 KDV dahil)
      // KDV (%1) = (Noter Satış Tutarı / 1.01) * 0.01
      const kdv1 = (notarySalePrice / 1.01) * 0.01;
      const matrah1 = notarySalePrice - kdv1;

      return {
        rows: [
          ["Satış Tutarı (Genel)", saleAmount || notarySalePrice],
          ["Noter Satış Fiyatı", notarySalePrice],
          ["Matrah (%1 Hariç)", matrah1],
          ["KDV (%1)", kdv1],
          ["Toplam Fatura Tutarı", notarySalePrice],
        ],
        vatRate: 1,
        vatAmount: kdv1,
        matrah: matrah1,
        total: notarySalePrice,
      };
    }

    if (vehicleRegime === "sirket_20") {
      // 3) Şirketten %20 KDV ile Alım
      // KDV (%20) = (Noter Satış Tutarı / 1.20) * 0.20
      const kdv20 = (notarySalePrice / 1.2) * 0.2;
      const matrah20 = notarySalePrice - kdv20;

      return {
        rows: [
          ["Satış Tutarı (Genel)", saleAmount || notarySalePrice],
          ["Noter Satış Fiyatı", notarySalePrice],
          ["Matrah (%20 Hariç)", matrah20],
          ["KDV (%20)", kdv20],
          ["Toplam Fatura Tutarı", notarySalePrice],
        ],
        vatRate: 20,
        vatAmount: kdv20,
        matrah: matrah20,
        total: notarySalePrice,
      };
    }

    return { rows: [], vatAmount: 0, total: 0 };
  }, [
    type,
    specialBase,
    specialBaseAmount,
    notaryAmount,
    otherAmount,
    vatRate,
    vehicleRegime,
    saleAmount,
    notarySalePrice,
    notaryPurchasePrice,
  ]);

  const submit = async () => {
    if (!vehicleId || !accountId || !invoiceNo) {
      toast.error("Araç, cari ve fatura no zorunlu");
      return;
    }
    setSaving(true);
    try {
      if (type === "purchase") {
        await createPurchaseInvoice({
          vehicleId,
          accountId,
          invoiceNo,
          invoiceDate,
          notaryAmount,
          otherAmount,
          vatRate,
          specialBase,
          specialBaseAmount: specialBase ? specialBaseAmount : undefined,
        });
      } else {
        await createSalesInvoice({
          vehicleId,
          accountId,
          invoiceNo,
          invoiceDate,
          purchaseRegime: vehicleRegime,
          saleAmount: saleAmount || notarySalePrice,
          notarySalePrice,
          notaryPurchasePrice,
          totalWithVat: notarySalePrice,
          vatRate: calculation.vatRate ?? 0,
        });
      }
      toast.success("Fatura oluşturuldu");
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    } finally {
      setSaving(false);
    }
  };

  // Autocomplete Seçenekleri
  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        label: v.plate,
        subLabel: [v.brandName, v.modelName, v.year ? String(v.year) : ""].filter(Boolean).join(" "),
        badge: v.status,
      })),
    [vehicles],
  );

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: a.name,
        subLabel: a.city ? `${a.city}${a.district ? ` / ${a.district}` : ""}` : undefined,
        badge: a.taxNumber ? `VKN: ${a.taxNumber}` : undefined,
      })),
    [accounts],
  );

  return (
    <Modal open={open} onClose={onClose} title={type === "purchase" ? "Yeni Alış Faturası" : "Yeni Satış Faturası"} className="max-w-3xl">
      <div className="space-y-4">
        {/* Üst Seçimler: Fatura Tipi, Araç, Cari */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Fatura Tipi"
            data={[
              { value: "purchase", label: "Alış Faturası" },
              { value: "sales", label: "Satış Faturası" },
            ]}
            value={type}
            onChange={(e) => setType(e.target.value as "purchase" | "sales")}
          />

          <SearchableSelect
            label="Araç"
            placeholder="Plaka veya model ara..."
            options={vehicleOptions}
            value={vehicleId}
            onChange={setVehicleId}
          />

          <SearchableSelect
            label={type === "purchase" ? "Satıcı Cari" : "Alıcı Müşteri"}
            placeholder="Cari ara..."
            options={accountOptions}
            value={accountId}
            onChange={setAccountId}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Fatura No" placeholder="GİB Fatura No" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          <Input label="Fatura Tarihi" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>

        {/* ALIŞ FATURASI FORMU */}
        {type === "purchase" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumericInput
                label="Noter Tutarı (₺)"
                placeholder="0,00"
                value={notaryAmount || undefined}
                onValueChange={(val) => setNotaryAmount(val || 0)}
              />
              <NumericInput
                label="Diğer Tutar (₺)"
                placeholder="0,00"
                value={otherAmount || undefined}
                onValueChange={(val) => setOtherAmount(val || 0)}
              />
              <Input
                label="KDV %"
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(+e.target.value)}
                disabled={specialBase}
              />
            </div>
            <Checkbox
              label="Özel matrah (ikinci el — araca KDV uygulanmaz)"
              checked={specialBase}
              onChange={(e) => setSpecialBase(e.target.checked)}
            />
            {specialBase && (
              <NumericInput
                label="Alış Özel Matrah Tutarı (₺)"
                placeholder="0,00"
                value={specialBaseAmount || undefined}
                onValueChange={(val) => setSpecialBaseAmount(val || 0)}
              />
            )}
          </div>
        ) : (
          /* SATIŞ FATURASI FORMU — 4 ALIM REJİMİNE GÖRE */
          <div className="space-y-3">
            {/* Araç Alım Rejimi Bilgi Kartı */}
            {selectedVehicle && (
              <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-3 text-xs dark:border-primary-900/40 dark:bg-primary-950/20">
                <div className="flex items-center justify-between font-semibold text-primary-900 dark:text-primary-200">
                  <span>Alım Rejimi: {regimeConfig.label}</span>
                  <span className="rounded bg-primary-100 px-2 py-0.5 text-[11px] text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                    KDV Yansıması: {regimeConfig.salesVatEffect}
                  </span>
                </div>
                <p className="mt-1 text-gray-600 dark:text-dark-300">
                  {regimeConfig.description}
                </p>
                {notaryPurchasePrice > 0 && (
                  <p className="mt-1 font-medium text-gray-700 dark:text-dark-200">
                    Kayıtlı Alış Noter Fiyatı: <b>{fmt(notaryPurchasePrice)} ₺</b>
                  </p>
                )}
              </div>
            )}

            {/* Fiyat Alanları: Satış Tutarı ve Satış Noter Fiyatı */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumericInput
                label="Satış Tutarı (₺)"
                placeholder="Genel anlaşma tutarı"
                value={saleAmount || undefined}
                onValueChange={(val) => setSaleAmount(val || 0)}
              />
              <NumericInput
                label="Satış Noter Fiyatı (₺)"
                placeholder="Noterde/Faturada görünecek tutar"
                value={notarySalePrice || undefined}
                onValueChange={(val) => setNotarySalePrice(val || 0)}
              />
            </div>
          </div>
        )}

        {/* Canlı Vergi ve Hesaplama Dökümü */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 dark:border-dark-500 dark:bg-dark-600/50">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
            Fatura & Vergi Hesaplama Detayı
          </h4>
          <div className="space-y-1.5 text-xs">
            {calculation.rows.map(([lbl, val]) => (
              <div key={lbl as string} className="flex justify-between text-gray-700 dark:text-dark-200">
                <span>{lbl as string}</span>
                <span className="font-semibold text-gray-900 dark:text-dark-50">{fmt(val as number)} ₺</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outlined" onClick={onClose}>
            İptal
          </Button>
          <Button color="primary" onClick={submit} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Faturayı Oluştur"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
