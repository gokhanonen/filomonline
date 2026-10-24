import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { Button, Checkbox, Input, NumericInput, Select, Spinner } from "@/components/ui";
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
  getInvoice,
  updateSalesInvoice,
} from "@/services/invoiceService";
import type { IntegrationStatus, SalesInvoiceDetail } from "@/@types/invoice";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialVehicleId?: string;
  initialType?: "purchase" | "sales";
  editingInvoiceId?: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function InvoiceForm({
  open,
  onClose,
  onSaved,
  initialVehicleId,
  initialType,
  editingInvoiceId,
}: Props) {
  const isEditing = !!editingInvoiceId;
  const [type, setType] = useState<"purchase" | "sales">("purchase");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [saving, setSaving] = useState(false);

  // Ortak Alanlar
  const [vehicleId, setVehicleId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [description, setDescription] = useState("");
  const [notaryJournalNo, setNotaryJournalNo] = useState("");
  const [locationId, setLocationId] = useState("");

  // Alış Faturası Özel Alanları
  const [notaryAmount, setNotaryAmount] = useState(0);
  const [otherAmount, setOtherAmount] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [specialBase, setSpecialBase] = useState(false);
  const [specialBaseAmount, setSpecialBaseAmount] = useState(0);

  // Satış Faturası Özel Alanları
  const [saleAmount, setSaleAmount] = useState(0); // Satış Tutarı (Genel)
  const [notarySalePrice, setNotarySalePrice] = useState(0); // Satış Noter Fiyatı
  const [notaryPurchasePriceOverride, setNotaryPurchasePriceOverride] = useState<number | null>(null);
  const [otherAmountExclNotary, setOtherAmountExclNotary] = useState(0);
  const [entityType, setEntityType] = useState<"INDIVIDUAL" | "CORPORATE">("CORPORATE");
  const [saleType, setSaleType] = useState<string>("Normal"); // 'Normal' | 'T Tipi'
  const [erpCode, setErpCode] = useState("");
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [originalSaleType, setOriginalSaleType] = useState<string>("Normal");

  // Araç ve Cari Listesini Yükle
  useEffect(() => {
    if (!open) return;
    listVehicles({ pageSize: 300 })
      .then((r) => setVehicles(r.items))
      .catch(() => void 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = type === "purchase" ? "SUPPLIER" : "CUSTOMER";
    listAccounts({ type: t, onlyActive: true, pageSize: 300 })
      .then((r) => setAccounts(r.items))
      .catch(() => void 0);
  }, [open, type]);

  // Form Reset ve Başlatma
  useEffect(() => {
    if (!open) return;

    if (!editingInvoiceId) {
      setType(initialType ?? "purchase");
      setVehicleId(initialVehicleId ?? "");
      setAccountId("");
      setInvoiceNo("");
      setInvoiceDate(today());
      setDescription("");
      setNotaryJournalNo("");
      setLocationId("");
      setNotaryAmount(0);
      setOtherAmount(0);
      setVatRate(20);
      setSpecialBase(false);
      setSpecialBaseAmount(0);
      setSaleAmount(0);
      setNotarySalePrice(0);
      setNotaryPurchasePriceOverride(null);
      setOtherAmountExclNotary(0);
      setEntityType("CORPORATE");
      setSaleType("Normal");
      setOriginalSaleType("Normal");
      setErpCode("");
      setIntegrationStatus(null);
      return;
    }

    // Düzenleme modunda faturayı API'den çek
    setLoadingInvoice(true);
    const invType = initialType ?? "sales";
    setType(invType);

    getInvoice(invType, editingInvoiceId)
      .then((inv: SalesInvoiceDetail | any) => {
        setVehicleId(inv.vehicleId || "");
        setAccountId(inv.accountId || "");
        setInvoiceNo(inv.invoiceNo || "");
        setInvoiceDate(inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().slice(0, 10) : today());
        setDescription(inv.description || "");
        setNotaryJournalNo(inv.notaryJournalNo || "");
        setLocationId(inv.locationId || "");
        setIntegrationStatus(inv.integrationStatus || null);

        if (invType === "purchase") {
          setNotaryAmount(Number(inv.notaryAmount || 0));
          setOtherAmount(Number(inv.otherAmount || 0));
          setVatRate(Number(inv.vatRate || 20));
          setSpecialBase(!!inv.specialBaseAmount);
          setSpecialBaseAmount(Number(inv.specialBaseAmount || 0));
        } else {
          setSaleAmount(Number(inv.saleAmount || 0));
          setNotarySalePrice(Number(inv.notarySalePrice || inv.totalWithVat || 0));
          setNotaryPurchasePriceOverride(
            inv.notaryPurchasePrice != null ? Number(inv.notaryPurchasePrice) : null,
          );
          setOtherAmountExclNotary(Number(inv.otherAmountExclNotary || 0));
          setEntityType(inv.entityType || "CORPORATE");
          const st = inv.saleType || "Normal";
          setSaleType(st);
          setOriginalSaleType(st);
          setErpCode(inv.erpCode || "");
        }
      })
      .catch((err) => {
        toast.error((err as { message?: string })?.message ?? "Fatura bilgileri alınamadı");
      })
      .finally(() => setLoadingInvoice(false));
  }, [open, editingInvoiceId, initialType, initialVehicleId]);

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

  const notaryPurchasePrice = useMemo(() => {
    if (notaryPurchasePriceOverride != null) return notaryPurchasePriceOverride;
    return Number(
      selectedVehicle?.purchaseNotaryPrice ?? selectedVehicle?.purchasePrice ?? 0,
    );
  }, [selectedVehicle, notaryPurchasePriceOverride]);

  // Araç seçildiğinde satış fiyatlarını otomatik doldur
  useEffect(() => {
    if (selectedVehicle && type === "sales" && !isEditing) {
      if (!saleAmount && selectedVehicle.listPrice) {
        setSaleAmount(Number(selectedVehicle.listPrice));
      }
      if (!notarySalePrice && selectedVehicle.tensf) {
        setNotarySalePrice(Number(selectedVehicle.tensf));
      } else if (!notarySalePrice && selectedVehicle.purchaseNotaryPrice) {
        setNotarySalePrice(Number(selectedVehicle.purchaseNotaryPrice));
      }
    }
  }, [selectedVehicle, type, isEditing]);

  // Müşteri seçildiğinde TCKN / VKN kontrolü ile şahıs/firma tipini otomatik tahmin et
  const handleAccountChange = (accId: string) => {
    setAccountId(accId);
    if (!accId) return;
    const acc = accounts.find((a) => a.id === accId);
    if (acc) {
      if (acc.taxNumber && acc.taxNumber.length === 10) {
        setEntityType("CORPORATE");
      } else if (acc.tckn && acc.tckn.length === 11) {
        setEntityType("INDIVIDUAL");
      }
    }
  };

  // Entegrasyon kilit durumları ve T Tipi kontrolü
  const isIntegrated = integrationStatus === "ENTEGRE_EDILDI";
  const wasTTipi = originalSaleType.toLowerCase().includes("t");
  const isTransitioningTTipiToNormal =
    isIntegrated && wasTTipi && !saleType.toLowerCase().includes("t");
  const isLocked = isIntegrated && !isTransitioningTTipiToNormal;

  // 4 ALIM REJİMİ & OTOMATİK VERGİ HESAPLAMA MOTORU
  const calculation = useMemo(() => {
    if (type === "purchase") {
      if (specialBase) {
        const fee = round(specialBaseAmount * 0.2);
        return {
          rows: [
            ["Alış Özel Matrah Tutarı", specialBaseAmount],
            ["Hizmet Bedeli (%20 KDV Dahil)", fee],
            ["Toplam Fatura", notaryAmount + otherAmount + fee],
          ],
          vatAmount: fee,
          total: notaryAmount + otherAmount + fee,
          matrah: specialBaseAmount,
        };
      }
      const base = notaryAmount + otherAmount;
      const vat = round((base * vatRate) / 100);
      return {
        rows: [
          ["Matrah", base],
          [`KDV (%${vatRate})`, vat],
          ["Toplam Fatura", base + vat],
        ],
        vatAmount: vat,
        total: base + vat,
        matrah: base,
      };
    }

    // --- SATIŞ FATURASI (4 ALIM REJİMİNE GÖRE) ---
    if (vehicleRegime === "sahis") {
      // 1) Şahıstan Alım:
      // Kâr Marjı = Noter Satış - Noter Alış
      const karMarji = Math.max(0, notarySalePrice - notaryPurchasePrice);
      // Hizmet Matrahı = Kâr Marjı / 1.20
      const hizmetMatrahi = karMarji > 0 ? round(karMarji / 1.2) : 0;
      // Hizmet KDV'si (%20) = Kâr Marjı - Hizmet Matrahı
      const hizmetKdv = karMarji > 0 ? round(karMarji - hizmetMatrahi) : 0;

      return {
        rows: [
          ["Satış Tutarı (Genel)", saleAmount || notarySalePrice],
          ["Noter Satış Fiyatı", notarySalePrice],
          ["Noter Alış Tutarı (-)", notaryPurchasePrice],
          ["Kâr Marjı", karMarji],
          ["Özel Matrah (Araç Bedeli - KDV %0)", notaryPurchasePrice],
          ["Hizmet Matrahı (Kâr Marjı / 1.20)", hizmetMatrahi],
          ["Hizmet KDV'si (%20)", hizmetKdv],
          ["Toplam Noter / Fatura Tutarı", notarySalePrice],
        ],
        vatRate: 20,
        vatAmount: hizmetKdv,
        matrah: round(notaryPurchasePrice + hizmetMatrahi),
        profitMargin: karMarji,
        serviceFee: hizmetMatrahi,
        serviceFeeVat: hizmetKdv,
        total: notarySalePrice,
      };
    }

    if (vehicleRegime === "sirket_1" || vehicleRegime === "galeri_ozel") {
      // 2) Şirketten %1 veya 4) Galeriden Özel Matrahlı (%1 KDV dahil tam fatura)
      const kdv1 = round((notarySalePrice / 1.01) * 0.01);
      const matrah1 = round(notarySalePrice - kdv1);
      const karMarji = Math.max(0, notarySalePrice - notaryPurchasePrice);

      return {
        rows: [
          ["Satış Tutarı (Genel)", saleAmount || notarySalePrice],
          ["Noter Satış Fiyatı", notarySalePrice],
          ["Noter Alış Tutarı (-)", notaryPurchasePrice],
          ["Kâr Marjı", karMarji],
          ["KDV Matrahı (%1 Hariç)", matrah1],
          ["KDV Tutarı (%1)", kdv1],
          ["Toplam Fatura Tutarı", notarySalePrice],
        ],
        vatRate: 1,
        vatAmount: kdv1,
        matrah: matrah1,
        profitMargin: karMarji,
        serviceFee: null,
        serviceFeeVat: null,
        total: notarySalePrice,
      };
    }

    if (vehicleRegime === "sirket_20") {
      // 3) Şirketten %20 KDV ile Alım (%20 KDV dahil tam fatura)
      const kdv20 = round((notarySalePrice / 1.2) * 0.2);
      const matrah20 = round(notarySalePrice - kdv20);
      const karMarji = Math.max(0, notarySalePrice - notaryPurchasePrice);

      return {
        rows: [
          ["Satış Tutarı (Genel)", saleAmount || notarySalePrice],
          ["Noter Satış Fiyatı", notarySalePrice],
          ["Noter Alış Tutarı (-)", notaryPurchasePrice],
          ["Kâr Marjı", karMarji],
          ["KDV Matrahı (%20 Hariç)", matrah20],
          ["KDV Tutarı (%20)", kdv20],
          ["Toplam Fatura Tutarı", notarySalePrice],
        ],
        vatRate: 20,
        vatAmount: kdv20,
        matrah: matrah20,
        profitMargin: karMarji,
        serviceFee: null,
        serviceFeeVat: null,
        total: notarySalePrice,
      };
    }

    return { rows: [], vatAmount: 0, total: 0, vatRate: 0, matrah: 0 };
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
        toast.success("Alış faturası oluşturuldu");
      } else {
        if (isEditing && editingInvoiceId) {
          await updateSalesInvoice(editingInvoiceId, {
            accountId,
            invoiceNo,
            invoiceDate,
            purchaseRegime: vehicleRegime,
            entityType,
            saleAmount: saleAmount || notarySalePrice,
            notarySalePrice,
            notaryPurchasePrice,
            saleType,
            notaryJournalNo,
            description,
            erpCode,
            otherAmountExclNotary,
          });
          if (isTransitioningTTipiToNormal) {
            toast.success("T Tipi satış faturası iptal kuyruğuna alındı ve yeni normal fatura oluşturuldu");
          } else {
            toast.success("Satış faturası güncellendi");
          }
        } else {
          await createSalesInvoice({
            vehicleId,
            accountId,
            invoiceNo,
            invoiceDate,
            purchaseRegime: vehicleRegime,
            entityType,
            saleAmount: saleAmount || notarySalePrice,
            notarySalePrice,
            notaryPurchasePrice,
            totalWithVat: notarySalePrice,
            vatRate: calculation.vatRate ?? 0,
            saleType,
            notaryJournalNo,
            description,
            erpCode,
            otherAmountExclNotary,
            locationId: locationId || undefined,
          });
          toast.success("Satış faturası oluşturuldu ve araç satıldı olarak işaretlendi");
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    } finally {
      setSaving(false);
    }
  };

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
        badge: a.taxNumber ? `VKN: ${a.taxNumber}` : a.tckn ? `TCKN: ${a.tckn}` : undefined,
      })),
    [accounts],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEditing
          ? `Satış Faturası Düzenle (${invoiceNo || "Fatura"})`
          : type === "purchase"
          ? "Yeni Alış Faturası"
          : "Yeni Satış Faturası (4 Alım Rejimi)"
      }
      className="max-w-3xl"
    >
      {loadingInvoice ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-8" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Entegrasyon Durumu & Uyarı Bannerları */}
          {isLocked && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
              <LockClosedIcon className="size-5 shrink-0" />
              <span>
                <strong>ERP'ye Entegre Edilmiş Fatura:</strong> Bu fatura muhasebe sistemine
                aktarıldığından kilitlidir. Yalnızca salt okunur incelenebilir.
              </span>
            </div>
          )}

          {isIntegrated && wasTTipi && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 text-xs">
              <ExclamationTriangleIcon className="size-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong>T Tipi Fatura Dönüşüm İzni:</strong> Bu fatura T Tipi olarak entegre edilmiştir.
                Satış tipini <strong>"Normal"</strong> olarak değiştirdiğinizde eski fatura iptal
                kuyruğuna alınacak ve yeni fatura sisteme kaydedilecektir.
              </div>
            </div>
          )}

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
              disabled={isEditing || isLocked}
            />

            <SearchableSelect
              label="Araç"
              placeholder="Plaka veya model ara..."
              options={vehicleOptions}
              value={vehicleId}
              onChange={setVehicleId}
              disabled={isEditing || isLocked}
            />

            <SearchableSelect
              label={type === "purchase" ? "Satıcı Cari" : "Alıcı Müşteri (Cari)"}
              placeholder="Cari ara..."
              options={accountOptions}
              value={accountId}
              onChange={handleAccountChange}
              disabled={isLocked}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Fatura No"
              placeholder="GİB Fatura No (örn: GIB202600000001)"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              disabled={isLocked}
            />
            <Input
              label="Fatura / Satış Tarihi"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              disabled={isLocked}
            />
            {type === "sales" ? (
              <Select
                label="Müşteri Tipi"
                data={[
                  { value: "CORPORATE", label: "Kurumsal (Firma)" },
                  { value: "INDIVIDUAL", label: "Bireysel (Şahıs)" },
                ]}
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as "INDIVIDUAL" | "CORPORATE")}
                disabled={isLocked}
              />
            ) : (
              <Input
                label="Noter Yevmiye No"
                placeholder="Yevmiye no"
                value={notaryJournalNo}
                onChange={(e) => setNotaryJournalNo(e.target.value)}
                disabled={isLocked}
              />
            )}
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
                  disabled={isLocked}
                />
                <NumericInput
                  label="Diğer Tutar (₺)"
                  placeholder="0,00"
                  value={otherAmount || undefined}
                  onValueChange={(val) => setOtherAmount(val || 0)}
                  disabled={isLocked}
                />
                <Input
                  label="KDV %"
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(+e.target.value)}
                  disabled={specialBase || isLocked}
                />
              </div>

              <Checkbox
                label="Özel matrah (ikinci el — araca KDV uygulanmaz)"
                checked={specialBase}
                onChange={(e) => setSpecialBase(e.target.checked)}
                disabled={isLocked}
              />
              {specialBase && (
                <NumericInput
                  label="Alış Özel Matrah Tutarı (₺)"
                  placeholder="0,00"
                  value={specialBaseAmount || undefined}
                  onValueChange={(val) => setSpecialBaseAmount(val || 0)}
                  disabled={isLocked}
                />
              )}
            </div>
          ) : (
            /* SATIŞ FATURASI FORMU — 4 ALIM REJİMİNE GÖRE */
            <div className="space-y-3">
              {/* Araç Alım Rejimi Bilgi Kartı */}
              {selectedVehicle && (
                <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-3.5 text-xs dark:border-primary-900/40 dark:bg-primary-950/20">
                  <div className="flex items-center justify-between font-semibold text-primary-900 dark:text-primary-200">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheckIcon className="size-4 text-primary-600" />
                      Araç Alım Rejimi: {regimeConfig.label}
                    </span>
                    <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                      KDV Etkisi: {regimeConfig.salesVatEffect}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-dark-300">
                    {regimeConfig.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 font-medium text-gray-700 dark:text-dark-200">
                    <span>
                      Kayıtlı Alış Noter Tutarı: <b>{fmt(notaryPurchasePrice)} ₺</b>
                    </span>
                    {selectedVehicle.tensf && (
                      <span>
                        TENSF: <b>{fmt(Number(selectedVehicle.tensf))} ₺</b>
                      </span>
                    )}
                    {selectedVehicle.listPrice && (
                      <span>
                        Liste Fiyatı: <b>{fmt(Number(selectedVehicle.listPrice))} ₺</b>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Fiyat Alanları: Satış Tutarı ve Satış Noter Fiyatı */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <NumericInput
                  label="Satış Tutarı (Genel Anlaşma ₺)"
                  placeholder="Genel anlaşma tutarı"
                  value={saleAmount || undefined}
                  onValueChange={(val) => setSaleAmount(val || 0)}
                  disabled={isLocked}
                />
                <NumericInput
                  label="Satış Noter Fiyatı (Fatura Tutarı ₺)"
                  placeholder="Noterde/Faturada görünecek tutar"
                  value={notarySalePrice || undefined}
                  onValueChange={(val) => setNotarySalePrice(val || 0)}
                  disabled={isLocked}
                />
                <NumericInput
                  label="Noter Harici Diğer Tutar (₺)"
                  placeholder="Opsiyonel ek tutar"
                  value={otherAmountExclNotary || undefined}
                  onValueChange={(val) => setOtherAmountExclNotary(val || 0)}
                  disabled={isLocked}
                />
              </div>

              {/* Satış Tipi, Noter Yevmiye No ve ERP Entegrasyon Kodu */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Select
                  label="Satış Tipi"
                  data={[
                    { value: "Normal", label: "Normal Satış" },
                    { value: "T Tipi", label: "T Tipi Satış" },
                  ]}
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value)}
                  disabled={isLocked && !wasTTipi}
                />

                <Input
                  label="Noter Yevmiye No"
                  placeholder="Örn: 12345"
                  value={notaryJournalNo}
                  onChange={(e) => setNotaryJournalNo(e.target.value)}
                  disabled={isLocked}
                />

                <Input
                  label="ERP Entegrasyon Kodu"
                  placeholder="Örn: FA-10023"
                  value={erpCode}
                  onChange={(e) => setErpCode(e.target.value)}
                  disabled={isLocked}
                />
              </div>

              <Input
                label="Fatura Açıklaması"
                placeholder="Fatura açıklaması veya notlar..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLocked}
              />
            </div>
          )}

          {/* Canlı Vergi ve Hesaplama Dökümü */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-dark-500 dark:bg-dark-600/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                Otomatik Vergi & Matrah Hesaplama Detayı
              </h4>
              <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                {type === "sales" ? `Rejim: ${regimeConfig.label}` : "Alış Faturası"}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              {calculation.rows.map(([lbl, val]) => (
                <div key={lbl as string} className="flex justify-between text-gray-700 dark:text-dark-200">
                  <span>{lbl as string}</span>
                  <span className="font-semibold text-gray-900 dark:text-dark-50">
                    {fmt(val as number)} ₺
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outlined" onClick={onClose}>
              {isLocked ? "Kapat" : "İptal"}
            </Button>
            {!isLocked && (
              <Button color="primary" onClick={submit} disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <Spinner className="size-4" /> Kaydediliyor...
                  </span>
                ) : isEditing ? (
                  isTransitioningTTipiToNormal ? (
                    "T Tipi Faturayı Dönüştür ve Kaydet"
                  ) : (
                    "Faturayı Güncelle"
                  )
                ) : (
                  "Faturayı Kes ve Onayla"
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function round(n: number) {
  return Number(n.toFixed(2));
}
