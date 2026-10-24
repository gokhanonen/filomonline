import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { toast } from "sonner";
import {
  TbCar,
  TbCamera,
  TbCurrencyLira,
  TbTool,
  TbFileText,
  TbPlus,
  TbCheck,
  TbX,
  TbTrash,
} from "react-icons/tb";

import { Button, Input, NumericInput, Switch, Textarea, Spinner, Tag } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect, type SearchableOption } from "@/components/shared/SearchableSelect";
import {
  DRIVE_LABELS,
  FUEL_LABELS,
  PURCHASE_REGIME_CONFIG,
  STATUS_TAG_COLOR,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  type PurchaseRegime,
  type Vehicle,
  type VehicleFormValues,
} from "@/@types/vehicle";
import type { CatalogAll } from "@/@types/catalog";
import type { Account } from "@/@types/account";
import type { Location } from "@/@types/location";
import {
  getCatalog,
  createSimple,
  createBrand,
  createModel,
} from "@/services/catalogService";
import {
  createVehicle,
  updateVehicle,
  getVehicle,
  addVehicleTramer,
  deleteVehicleTramer,
} from "@/services/vehicleService";
import { listAccounts, createAccount } from "@/services/accountService";
import { listLocations } from "@/services/locationService";
import { uploadBlob } from "@/services/storageService";
import { resizeWithThumbnail, DOCUMENT_PHOTO_MAX_BYTES } from "@/utils/imageResize";
import { VehiclePhotos } from "./VehiclePhotos";
import { DocumentManager } from "@/components/shared/DocumentManager";

const schema = Yup.object().shape({
  plate: Yup.string().trim().required("Plaka zorunlu"),
  status: Yup.string().oneOf(["STOKTA", "KIRALAMADA", "SATILDI"]).required(),
  categoryId: Yup.string().optional(),
  vehicleTypeId: Yup.string().optional(),
  brandId: Yup.string().optional(),
  modelId: Yup.string().optional(),
  year: Yup.number().min(1950).max(2100).optional().nullable(),
  chassisNo: Yup.string().trim().optional(),
  engineNo: Yup.string().trim().optional(),
  erpCode: Yup.string().trim().optional(),
  registrationModel: Yup.string().trim().optional(),
  fuelType: Yup.string().optional(),
  transmission: Yup.string().optional(),
  driveType: Yup.string().optional(),
  km: Yup.number().min(0).optional().nullable(),
  bodyTypeId: Yup.string().optional(),
  colorId: Yup.string().optional(),
  horsePower: Yup.number().min(0).optional().nullable(),
  enginePower: Yup.number().min(0).optional().nullable(),
  engineVolume: Yup.number().min(0).optional().nullable(),
  warranty: Yup.boolean().optional(),
  heavyDamage: Yup.boolean().optional(),
  spareKey: Yup.boolean().optional(),
  listPrice: Yup.number().min(0).optional().nullable(),
  tensf: Yup.number().min(0).optional().nullable(),
  purchasePrice: Yup.number().min(0).optional().nullable(),
  purchaseNotaryPrice: Yup.number().min(0).optional().nullable(),
  purchaseDate: Yup.string().optional(),
  purchaseRegime: Yup.string().oneOf(["sahis", "sirket_1", "sirket_20", "galeri_ozel"]).default("sahis"),
  specialBase: Yup.boolean().optional(),
  specialBaseAmount: Yup.number().min(0).optional().nullable(),
  purchaseVatRate: Yup.number().optional().nullable(),
  purchaseInvoiceNo: Yup.string().trim().optional(),
  purchaseInvoiceDate: Yup.string().optional(),
  purchaseInvoiceDescription: Yup.string().trim().optional(),
  supplierId: Yup.string().optional(),
  purchaseLocationId: Yup.string().optional(),
  notes: Yup.string().trim().optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  vehicle?: Vehicle | null;
}

const STEPS = [
  { id: 0, label: "Temel Bilgiler", icon: TbCar },
  { id: 1, label: "Görünüm & Durum", icon: TbCamera },
  { id: 2, label: "Fiyat & Alış", icon: TbCurrencyLira },
  { id: 3, label: "Tramer & Notlar", icon: TbTool },
  { id: 4, label: "Evrak Yükleme", icon: TbFileText },
];

export function VehicleForm({ open, onClose, onSaved, vehicle }: Props) {
  const isEdit = !!vehicle;
  const [activeStep, setActiveStep] = useState(0);

  // Veri kaynakları
  const [catalog, setCatalog] = useState<CatalogAll | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Tramer listesi (düzenleme veya yeni araç için)
  const [tramerList, setTramerList] = useState<
    Array<{ id: string; date: string; amount: number; description: string; photoUrl?: string | null }>
  >([]);
  const [showTramerForm, setShowTramerForm] = useState(false);
  const [tramerDate, setTramerDate] = useState("");
  const [tramerAmount, setTramerAmount] = useState("");
  const [tramerDescription, setTramerDescription] = useState("");
  const [tramerPhotoUrl, setTramerPhotoUrl] = useState<string | null>(null);
  const [tramerUploading, setTramerUploading] = useState(false);
  const tramerFileRef = useRef<HTMLInputElement>(null);

  // Quick Add modalları state
  const [quickAddModal, setQuickAddModal] = useState<{
    open: boolean;
    type: "category" | "type" | "brand" | "model" | "bodyType" | "color" | "supplier";
    title: string;
    value: string;
    extraValue?: string;
  }>({
    open: false,
    type: "category",
    title: "",
    value: "",
  });
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      plate: "",
      status: "STOKTA",
      purchaseRegime: "sahis",
      purchaseVatRate: 0,
      specialBase: false,
      warranty: false,
      heavyDamage: false,
      spareKey: false,
    },
  });

  const plateVal = watch("plate");
  const brandIdVal = watch("brandId");
  const modelIdVal = watch("modelId");
  const yearVal = watch("year");
  const statusVal = watch("status");
  const categoryIdVal = watch("categoryId");
  const purchasePriceVal = watch("purchasePrice") || 0;
  const purchaseNotaryPriceVal = watch("purchaseNotaryPrice") || 0;
  const currentRegime = (watch("purchaseRegime") || "sahis") as PurchaseRegime;
  const regimeConfig = PURCHASE_REGIME_CONFIG[currentRegime] || PURCHASE_REGIME_CONFIG.sahis;

  // Hesaplanan fark (Alış Fiyatı - Alış Noter Tutarı)
  const priceDiff = useMemo(() => {
    return Number(purchasePriceVal) - Number(purchaseNotaryPriceVal);
  }, [purchasePriceVal, purchaseNotaryPriceVal]);

  // Katalog ve veri yükleme
  const reloadCatalog = async () => {
    try {
      const data = await getCatalog();
      setCatalog(data);
      return data;
    } catch {
      toast.error("Katalog yüklenemedi");
      return null;
    }
  };

  const reloadAccounts = async () => {
    try {
      const res = await listAccounts({ onlyActive: true, pageSize: 500 });
      setAccounts(res.items);
    } catch {
      // sessiz
    }
  };

  const reloadLocations = async () => {
    try {
      const res = await listLocations({ onlyActive: true, pageSize: 200 });
      setLocations(res.items);
    } catch {
      // sessiz
    }
  };

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      reloadCatalog();
      reloadAccounts();
      reloadLocations();
    }
  }, [open]);

  // Form Resetleme / Veri doldurma
  useEffect(() => {
    if (open) {
      const initialCatId =
        vehicle?.categoryId ||
        (vehicle?.brandId && catalog?.brands?.find((b) => b.id === vehicle.brandId)?.categoryId) ||
        "";

      const determinedRegime: PurchaseRegime =
        vehicle?.purchaseRegime ||
        (vehicle?.specialBase
          ? "galeri_ozel"
          : Number(vehicle?.purchaseVatRate) === 1
            ? "sirket_1"
            : Number(vehicle?.purchaseVatRate) === 20
              ? "sirket_20"
              : "sahis");

      const cfg = PURCHASE_REGIME_CONFIG[determinedRegime];

      reset({
        plate: vehicle?.plate ?? "",
        status: vehicle?.status ?? "STOKTA",
        categoryId: initialCatId,
        vehicleTypeId: vehicle?.vehicleTypeId ?? "",
        brandId: vehicle?.brandId ?? "",
        modelId: vehicle?.modelId ?? "",
        year: vehicle?.year ?? undefined,
        chassisNo: vehicle?.chassisNo ?? "",
        engineNo: vehicle?.engineNo ?? "",
        erpCode: vehicle?.erpCode ?? "",
        registrationModel: vehicle?.registrationModel ?? "",
        fuelType: vehicle?.fuelType ?? "",
        transmission: vehicle?.transmission ?? "",
        driveType: vehicle?.driveType ?? "",
        km: vehicle?.km ?? undefined,
        bodyTypeId: vehicle?.bodyTypeId ?? "",
        colorId: vehicle?.colorId ?? "",
        horsePower: vehicle?.horsePower ?? undefined,
        enginePower: vehicle?.enginePower ?? undefined,
        engineVolume: vehicle?.engineVolume ?? undefined,
        warranty: vehicle?.warranty ?? false,
        heavyDamage: vehicle?.heavyDamage ?? false,
        spareKey: vehicle?.spareKey ?? false,
        listPrice: vehicle?.listPrice ? Number(vehicle.listPrice) : undefined,
        tensf: vehicle?.tensf ? Number(vehicle.tensf) : undefined,
        purchasePrice: vehicle?.purchasePrice ? Number(vehicle.purchasePrice) : undefined,
        purchaseNotaryPrice: vehicle?.purchaseNotaryPrice ? Number(vehicle.purchaseNotaryPrice) : undefined,
        purchaseDate: vehicle?.purchaseDate ? vehicle.purchaseDate.slice(0, 10) : "",
        purchaseRegime: determinedRegime,
        purchaseVatRate: vehicle?.purchaseVatRate != null ? Number(vehicle.purchaseVatRate) : cfg.purchaseVatRate,
        specialBase: vehicle?.specialBase != null ? vehicle.specialBase : cfg.specialBase,
        specialBaseAmount: vehicle?.specialBaseAmount ? Number(vehicle.specialBaseAmount) : undefined,
        purchaseInvoiceNo: vehicle?.purchaseInvoiceNo ?? "",
        purchaseInvoiceDate: vehicle?.purchaseInvoiceDate ? vehicle.purchaseInvoiceDate.slice(0, 10) : "",
        purchaseInvoiceDescription: vehicle?.purchaseInvoiceDescription ?? "",
        supplierId: vehicle?.supplierId ?? "",
        purchaseLocationId: vehicle?.purchaseLocationId ?? "",
        notes: vehicle?.notes ?? "",
      });

      // Tramer kayıtları
      if (vehicle?.tramerSet) {
        setTramerList(
          vehicle.tramerSet.map((t) => ({
            id: t.id,
            date: t.date ? t.date.slice(0, 10) : "",
            amount: Number(t.amount) || 0,
            description: t.description,
            photoUrl: t.photoUrl ?? null,
          })),
        );
      } else {
        setTramerList([]);
      }
    }
  }, [open, vehicle, catalog, reset]);

  const handleRegimeChange = (regime: PurchaseRegime) => {
    setValue("purchaseRegime", regime);
    const cfg = PURCHASE_REGIME_CONFIG[regime];
    setValue("purchaseVatRate", cfg.purchaseVatRate);
    setValue("specialBase", cfg.specialBase);
    if (!cfg.specialBase) {
      setValue("specialBaseAmount", undefined);
    }
  };

  const filteredBrands = useMemo(() => {
    if (!catalog?.brands) return [];
    if (!categoryIdVal) return catalog.brands;
    return catalog.brands.filter((b) => b.categoryId === categoryIdVal);
  }, [catalog, categoryIdVal]);

  const currentBrand = useMemo(() => {
    return catalog?.brands.find((b) => b.id === brandIdVal);
  }, [catalog, brandIdVal]);

  const models = useMemo(() => {
    return currentBrand?.models ?? [];
  }, [currentBrand]);

  const currentModel = useMemo(() => {
    return models.find((m) => m.id === modelIdVal);
  }, [models, modelIdVal]);

  // Autocomplete Select Options
  const supplierOptions = useMemo<SearchableOption[]>(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: a.name,
        subLabel: [a.taxNumber || a.tckn, a.phone].filter(Boolean).join(" • "),
        badge: a.type === "SUPPLIER" ? "Tedarikçi" : a.type === "CUSTOMER" ? "Müşteri" : "Cari",
      })),
    [accounts],
  );

  const locationOptions = useMemo<SearchableOption[]>(
    () =>
      locations.map((l) => ({
        value: l.id,
        label: l.name,
        subLabel: [l.code, l.city].filter(Boolean).join(" • "),
      })),
    [locations],
  );

  // Quick Add Eylemleri
  const handleOpenQuickAdd = (
    type: "category" | "type" | "brand" | "model" | "bodyType" | "color" | "supplier",
    title: string,
  ) => {
    setQuickAddModal({
      open: true,
      type,
      title,
      value: "",
      extraValue: "",
    });
  };

  const handleQuickAddSubmit = async () => {
    const val = quickAddModal.value.trim();
    if (!val) {
      toast.error("Lütfen bir isim girin");
      return;
    }
    setQuickAddLoading(true);
    try {
      if (quickAddModal.type === "category") {
        const created = await createSimple("vehicle-categories", val);
        await reloadCatalog();
        setValue("categoryId", created.id);
        toast.success(`"${val}" kategorisi eklendi ve seçildi`);
      } else if (quickAddModal.type === "type") {
        const created = await createSimple("vehicle-types", val);
        await reloadCatalog();
        setValue("vehicleTypeId", created.id);
        toast.success(`"${val}" araç tipi eklendi ve seçildi`);
      } else if (quickAddModal.type === "bodyType") {
        const created = await createSimple("body-types", val);
        await reloadCatalog();
        setValue("bodyTypeId", created.id);
        toast.success(`"${val}" kasa tipi eklendi ve seçildi`);
      } else if (quickAddModal.type === "color") {
        const created = await createSimple("colors", val);
        await reloadCatalog();
        setValue("colorId", created.id);
        toast.success(`"${val}" rengi eklendi ve seçildi`);
      } else if (quickAddModal.type === "brand") {
        const created = await createBrand(val, categoryIdVal || undefined);
        await reloadCatalog();
        setValue("brandId", created.id);
        setValue("modelId", "");
        toast.success(`"${val}" markası eklendi ve seçildi`);
      } else if (quickAddModal.type === "model") {
        if (!brandIdVal) {
          toast.error("Model eklemek için önce marka seçmelisiniz");
          return;
        }
        const created = await createModel(brandIdVal, val);
        await reloadCatalog();
        setValue("modelId", created.id);
        toast.success(`"${val}" modeli eklendi ve seçildi`);
      } else if (quickAddModal.type === "supplier") {
        const phone = quickAddModal.extraValue?.trim() || "";
        const created = await createAccount({
          name: val,
          type: "SUPPLIER",
          entityType: "CORPORATE",
          phone: phone || undefined,
        });
        await reloadAccounts();
        setValue("supplierId", created.id);
        toast.success(`"${val}" carisi eklendi ve seçildi`);
      }
      setQuickAddModal((prev) => ({ ...prev, open: false, value: "", extraValue: "" }));
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Ekleme başarısız");
    } finally {
      setQuickAddLoading(false);
    }
  };

  // Tramer İşlemleri
  const handleTramerFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTramerUploading(true);
    try {
      const { full } = await resizeWithThumbnail(file, DOCUMENT_PHOTO_MAX_BYTES);
      const fileKey = await uploadBlob(full, `tramer_${Date.now()}.jpg`, "documents");
      setTramerPhotoUrl(fileKey);
      toast.success("Hasar görseli yüklendi");
    } catch {
      toast.error("Görsel yüklenemedi");
    } finally {
      setTramerUploading(false);
      if (tramerFileRef.current) tramerFileRef.current.value = "";
    }
  };

  const handleAddTramerRecord = async () => {
    if (!tramerDate || !tramerAmount) {
      toast.error("Tarih ve tutar zorunludur");
      return;
    }
    const amt = parseFloat(tramerAmount);
    if (isNaN(amt) || amt < 0) {
      toast.error("Geçerli bir tutar giriniz");
      return;
    }

    if (isEdit && vehicle) {
      try {
        await addVehicleTramer(vehicle.id, {
          date: new Date(tramerDate).toISOString(),
          amount: amt,
          description: tramerDescription,
          photoUrl: tramerPhotoUrl || undefined,
        });
        toast.success("Tramer kaydı eklendi");
        // Yeniden yükle
        const updated = await getVehicle(vehicle.id);
        if (updated.tramerSet) {
          setTramerList(
            updated.tramerSet.map((t) => ({
              id: t.id,
              date: t.date ? t.date.slice(0, 10) : "",
              amount: Number(t.amount) || 0,
              description: t.description,
              photoUrl: t.photoUrl ?? null,
            })),
          );
        }
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Tramer eklenemedi");
        return;
      }
    } else {
      // Yerel liste
      setTramerList((prev) => [
        ...prev,
        {
          id: `temp_${Date.now()}`,
          date: tramerDate,
          amount: amt,
          description: tramerDescription,
          photoUrl: tramerPhotoUrl,
        },
      ]);
      toast.success("Tramer kaydı listeye eklendi");
    }

    setTramerDate("");
    setTramerAmount("");
    setTramerDescription("");
    setTramerPhotoUrl(null);
    setShowTramerForm(false);
  };

  const handleDeleteTramerRecord = async (id: string) => {
    if (isEdit && vehicle && !id.startsWith("temp_")) {
      try {
        await deleteVehicleTramer(vehicle.id, id);
        toast.success("Tramer kaydı silindi");
        setTramerList((prev) => prev.filter((t) => t.id !== id));
      } catch {
        toast.error("Tramer kaydı silinemedi");
      }
    } else {
      setTramerList((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tramer kaydı kaldırıldı");
    }
  };

  // Submit
  const onSubmit = async (values: VehicleFormValues) => {
    const brand = catalog?.brands.find((b) => b.id === values.brandId);
    const model = models.find((m) => m.id === values.modelId);
    const color = catalog?.colors.find((c) => c.id === values.colorId);

    const payload: VehicleFormValues & { tramerSet?: any[] } = {
      ...values,
      plate: values.plate.toUpperCase().trim(),
      brandName: brand?.name,
      modelName: model?.name,
      colorName: color?.name,
    };

    // Yeni araç oluştururken yerel tramer kayıtlarını dahil et
    if (!isEdit && tramerList.length > 0) {
      payload.tramerSet = tramerList.map((t) => ({
        date: new Date(t.date).toISOString(),
        amount: t.amount,
        description: t.description,
        photoUrl: t.photoUrl ?? undefined,
      }));
    }

    try {
      if (isEdit) {
        await updateVehicle(vehicle!.id, payload);
        toast.success("Araç başarıyla güncellendi");
      } else {
        await createVehicle(payload);
        toast.success("Araç başarıyla oluşturuldu");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="" className="max-w-6xl w-full p-0 overflow-hidden">
      {/* Sticky Top Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/90 px-6 py-3.5 backdrop-blur-xs dark:border-dark-600 dark:bg-dark-800/90">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
              {isEdit ? "Araç Düzenleme" : "Yeni Araç Kaydı"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="rounded-md border border-gray-300 bg-white px-2 py-0.5 font-mono text-base font-bold text-gray-900 shadow-2xs dark:border-dark-500 dark:bg-dark-700 dark:text-dark-50">
                {plateVal || "PLAKA GİRİLMEDİ"}
              </span>
              {(currentBrand?.name || currentModel?.name) && (
                <span className="hidden text-sm font-semibold text-gray-700 dark:text-dark-100 sm:inline-block">
                  {[currentBrand?.name, currentModel?.name].filter(Boolean).join(" ")}
                </span>
              )}
              {yearVal && (
                <span className="text-xs text-gray-400 dark:text-dark-400">({yearVal})</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusVal && (
            <Tag color={STATUS_TAG_COLOR[statusVal]}>
              {VEHICLE_STATUS_LABELS[statusVal]}
            </Tag>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-dark-100"
          >
            <TbX className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Container: Stepper Sidebar + Steps Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        <div className="flex flex-col md:flex-row min-h-[520px] max-h-[calc(88vh-130px)]">
          {/* Stepper Sidebar */}
          <div className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50/60 p-3 dark:border-dark-600 dark:bg-dark-800/40">
            <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isCurrent = activeStep === step.id;
                const isPassed = activeStep > step.id || isEdit;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (isEdit || step.id <= activeStep + 1) {
                        setActiveStep(step.id);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition shrink-0 md:w-full ${
                      isCurrent
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 shadow-2xs"
                        : isPassed
                          ? "text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-700/60"
                          : "text-gray-400 opacity-60 cursor-not-allowed dark:text-dark-400"
                    }`}
                  >
                    <div
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        isCurrent
                          ? "bg-primary-600 text-white"
                          : isPassed
                            ? "bg-emerald-600 text-white"
                            : "border border-gray-300 text-gray-500 dark:border-dark-500 dark:text-dark-400"
                      }`}
                    >
                      {isPassed && !isCurrent ? <TbCheck className="size-3.5" /> : step.id + 1}
                    </div>
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steps Content Area */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* ADIM 0: Temel Bilgiler */}
            {activeStep === 0 && (
              <div className="space-y-6">
                {/* Genel Özellikler */}
                <div className="rounded-xl border border-gray-200 bg-white p-4.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Genel Özellikler
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Input
                      label="Plaka *"
                      placeholder="34 ABC 123"
                      {...register("plate")}
                      error={errors.plate?.message}
                    />

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
                        Durum *
                      </label>
                      <select
                        {...register("status")}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="STOKTA">Stokta</option>
                        <option value="KIRALAMADA">Kiralamada</option>
                        <option value="SATILDI">Satıldı</option>
                      </select>
                    </div>

                    {/* Kategori + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-dark-200">
                          Kategori
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAdd("category", "Yeni Kategori Ekle")}
                          className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <TbPlus className="size-3.5" /> Ekle
                        </button>
                      </div>
                      <select
                        {...register("categoryId")}
                        onChange={(e) => {
                          setValue("categoryId", e.target.value);
                          setValue("brandId", "");
                          setValue("modelId", "");
                        }}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">Seçiniz</option>
                        {catalog?.vehicleCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Marka + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-dark-200">
                          Marka
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAdd("brand", "Yeni Marka Ekle")}
                          className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <TbPlus className="size-3.5" /> Ekle
                        </button>
                      </div>
                      <select
                        {...register("brandId")}
                        onChange={(e) => {
                          const newBrandId = e.target.value;
                          setValue("brandId", newBrandId);
                          setValue("modelId", "");
                          if (!categoryIdVal && newBrandId) {
                            const b = catalog?.brands.find((x) => x.id === newBrandId);
                            if (b?.categoryId) setValue("categoryId", b.categoryId);
                          }
                        }}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">Seçiniz</option>
                        {filteredBrands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Model + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-dark-200">
                          Model
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (!brandIdVal) {
                              toast.error("Önce bir marka seçmelisiniz");
                              return;
                            }
                            handleOpenQuickAdd("model", "Yeni Model Ekle");
                          }}
                          className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <TbPlus className="size-3.5" /> Ekle
                        </button>
                      </div>
                      <select
                        {...register("modelId")}
                        disabled={!brandIdVal}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden disabled:bg-gray-100 disabled:opacity-60 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">{brandIdVal ? "Seçiniz" : "Önce Marka Seçiniz"}</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Araç Tipi + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-dark-200">
                          Araç Tipi
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAdd("type", "Yeni Araç Tipi Ekle")}
                          className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <TbPlus className="size-3.5" /> Ekle
                        </button>
                      </div>
                      <select
                        {...register("vehicleTypeId")}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">Seçiniz</option>
                        {catalog?.vehicleTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Yıl"
                      type="number"
                      placeholder="2024"
                      {...register("year", { valueAsNumber: true })}
                      error={errors.year?.message}
                    />

                    <Input
                      label="ERP Kodu"
                      placeholder="ERP Stok / Referans Kodu"
                      {...register("erpCode")}
                    />

                    <Input
                      label="Ruhsat Model Adı"
                      placeholder="Ruhsatta yazan tam model adı"
                      {...register("registrationModel")}
                    />

                    <Input
                      label="Şase No"
                      placeholder="WBA..."
                      {...register("chassisNo")}
                    />

                    <Input
                      label="Motor No"
                      placeholder="Motor Numarası"
                      {...register("engineNo")}
                    />

                    <Controller
                      name="listPrice"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          label="Liste Fiyatı (₺)"
                          placeholder="0,00"
                          value={field.value}
                          onValueChange={field.onChange}
                          error={errors.listPrice?.message}
                        />
                      )}
                    />

                    <Controller
                      name="tensf"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          label="TENSF (₺)"
                          placeholder="0,00"
                          value={field.value}
                          onValueChange={field.onChange}
                          error={errors.tensf?.message}
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Teknik Özellikler */}
                <div className="rounded-xl border border-gray-200 bg-white p-4.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Teknik Özellikler
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Controller
                      name="km"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          label="KM"
                          suffix="km"
                          placeholder="0"
                          options={{ numeralDecimalScale: 0 }}
                          value={field.value}
                          onValueChange={field.onChange}
                          error={errors.km?.message}
                        />
                      )}
                    />

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
                        Yakıt
                      </label>
                      <select
                        {...register("fuelType")}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">Seçiniz</option>
                        {Object.entries(FUEL_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
                        Vites
                      </label>
                      <select
                        {...register("transmission")}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">Seçiniz</option>
                        {Object.entries(TRANSMISSION_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Kasa Tipi + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-dark-200">
                          Kasa Tipi
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAdd("bodyType", "Yeni Kasa Tipi Ekle")}
                          className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <TbPlus className="size-3.5" /> Ekle
                        </button>
                      </div>
                      <select
                        {...register("bodyTypeId")}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">Seçiniz</option>
                        {catalog?.bodyTypes.map((bt) => (
                          <option key={bt.id} value={bt.id}>
                            {bt.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Motor Gücü (kW)"
                      type="number"
                      placeholder="kW"
                      {...register("enginePower", { valueAsNumber: true })}
                    />

                    <Input
                      label="Motor Gücü (HP)"
                      type="number"
                      placeholder="HP"
                      {...register("horsePower", { valueAsNumber: true })}
                    />

                    <Input
                      label="Motor Hacmi (cc)"
                      type="number"
                      placeholder="1600"
                      {...register("engineVolume", { valueAsNumber: true })}
                    />

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
                        Çekiş
                      </label>
                      <select
                        {...register("driveType")}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">Seçiniz</option>
                        {Object.entries(DRIVE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ADIM 1: Görünüm ve Durum */}
            {activeStep === 1 && (
              <div className="space-y-6">
                {/* Araç Fotoğrafları (Kapak, İç, Dış Tabları) */}
                <div className="rounded-xl border border-gray-200 bg-white p-4.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Araç Fotoğrafları
                  </h4>
                  {isEdit && vehicle ? (
                    <VehiclePhotos vehicleId={vehicle.id} />
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/70 p-6 text-center dark:border-dark-500 dark:bg-dark-800/40">
                      <TbCamera className="mx-auto size-10 text-gray-400" />
                      <p className="mt-2 text-xs font-medium text-gray-700 dark:text-dark-200">
                        Fotoğrafları araç kaydedildikten sonra yükleyebilirsiniz.
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Kapak fotoğrafı (1 adet), iç ve dış fotoğraflar kategorili olarak saklanır ve
                        otomatik optimize edilir.
                      </p>
                    </div>
                  )}
                </div>

                {/* Renk & Durum Özellikleri (Switches) */}
                <div className="rounded-xl border border-gray-200 bg-white p-4.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Renk ve Donanım Durumu
                  </h4>

                  <div className="max-w-xs">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700 dark:text-dark-200">
                        Renk
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickAdd("color", "Yeni Renk Ekle")}
                        className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        <TbPlus className="size-3.5" /> Ekle
                      </button>
                    </div>
                    <select
                      {...register("colorId")}
                      className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                    >
                      <option value="">Renk Seçiniz</option>
                      {catalog?.colors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Switch Toggles */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/60 p-3.5 dark:border-dark-600 dark:bg-dark-800/40">
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-dark-100">
                          Yedek Anahtar
                        </p>
                        <p className="text-[11px] text-gray-400">Yedek anahtar mevcut mu?</p>
                      </div>
                      <Controller
                        name="spareKey"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/60 p-3.5 dark:border-dark-600 dark:bg-dark-800/40">
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-dark-100">
                          Garanti Durumu
                        </p>
                        <p className="text-[11px] text-gray-400">Garanti kapsamında mı?</p>
                      </div>
                      <Controller
                        name="warranty"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/60 p-3.5 dark:border-dark-600 dark:bg-dark-800/40">
                      <div>
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                          Ağır Hasar Kaydı
                        </p>
                        <p className="text-[11px] text-gray-400">Pert / ağır hasar kaydı var mı?</p>
                      </div>
                      <Controller
                        name="heavyDamage"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            color="error"
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ADIM 2: Fiyat ve Alış Bilgileri */}
            {activeStep === 2 && (
              <div className="space-y-6">
                {/* 4 Alım Rejimi Seçimi & Bilgi Paneli */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-dark-600 dark:bg-dark-800/50">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Alım Rejimi ve KDV Yapılandırması
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
                        Alım Rejimi *
                      </label>
                      <select
                        value={currentRegime}
                        onChange={(e) => handleRegimeChange(e.target.value as PurchaseRegime)}
                        className="block h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="sahis">Şahıstan (Özel Matrah Yok)</option>
                        <option value="sirket_1">Şirketten (%1 KDV)</option>
                        <option value="sirket_20">Şirketten (%20 KDV)</option>
                        <option value="galeri_ozel">Galeriden (Özel Matrahlı)</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
                        Alış KDV Oranı (Kilitli)
                      </label>
                      <div className="flex h-9 items-center rounded-lg border border-gray-200 bg-gray-100 px-3 text-xs font-bold text-gray-700 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-200">
                        %{regimeConfig.purchaseVatRate}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
                        Satış KDV Yansıması
                      </label>
                      <div className="flex h-9 items-center truncate rounded-lg border border-gray-200 bg-gray-100 px-3 text-xs font-bold text-primary-700 dark:border-dark-500 dark:bg-dark-800 dark:text-primary-400">
                        {regimeConfig.salesVatEffect}
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 text-[11px] text-gray-500 dark:text-dark-300">
                    {regimeConfig.description}
                  </p>

                  {/* Fatura Bilgileri (Şirket & Galeri için) */}
                  {(currentRegime === "sirket_1" ||
                    currentRegime === "sirket_20" ||
                    currentRegime === "galeri_ozel") && (
                    <div className="mt-3.5 border-t border-gray-200 pt-3 dark:border-dark-600">
                      <p className="mb-2 text-xs font-bold text-gray-700 dark:text-dark-200">
                        Alış Fatura Bilgileri
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input
                          label="Fatura No"
                          placeholder="ABC20240000123"
                          {...register("purchaseInvoiceNo")}
                        />
                        <Input
                          label="Fatura Tarihi"
                          type="date"
                          {...register("purchaseInvoiceDate")}
                        />
                        <Input
                          label="Fatura Açıklaması"
                          placeholder="Fatura açıklaması..."
                          {...register("purchaseInvoiceDescription")}
                        />
                      </div>
                    </div>
                  )}

                  {/* Özel Matrah Tutarı */}
                  {currentRegime === "galeri_ozel" && (
                    <div className="mt-3.5 border-t border-gray-200 pt-3 dark:border-dark-600">
                      <div className="max-w-xs">
                        <Controller
                          name="specialBaseAmount"
                          control={control}
                          render={({ field }) => (
                            <NumericInput
                              label="Alış Özel Matrah Tutarı (₺) *"
                              placeholder="0,00"
                              value={field.value}
                              onValueChange={field.onChange}
                              error={errors.specialBaseAmount?.message}
                            />
                          )}
                        />
                        <p className="mt-1 text-[11px] text-gray-400">
                          Önceki galerinin faturasında belirtilen özel matrah tutarı
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fiyat ve Cari Alanları */}
                <div className="rounded-xl border border-gray-200 bg-white p-4.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Alış Fiyatları ve Satıcı Bilgileri
                  </h4>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Controller
                      name="purchasePrice"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          label="Alış Fiyatı (₺)"
                          placeholder="0,00"
                          value={field.value}
                          onValueChange={field.onChange}
                          error={errors.purchasePrice?.message}
                        />
                      )}
                    />

                    <Controller
                      name="purchaseNotaryPrice"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          label="Alış Noter Fiyatı (₺)"
                          placeholder="0,00"
                          value={field.value}
                          onValueChange={field.onChange}
                          error={errors.purchaseNotaryPrice?.message}
                        />
                      )}
                    />

                    {/* Canlı Fark Göstergesi */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
                        Fark (Alış - Noter)
                      </label>
                      <div
                        className={`flex h-9 items-center justify-end rounded-lg border px-3 text-xs font-bold font-mono ${
                          priceDiff === 0
                            ? "border-gray-200 bg-gray-50 text-gray-600 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-300"
                            : priceDiff > 0
                              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                        }`}
                      >
                        {priceDiff > 0 ? "+" : ""}
                        {priceDiff.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ₺
                      </div>
                    </div>

                    <Input
                      label="Alış Tarihi"
                      type="date"
                      {...register("purchaseDate")}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                    {/* Satıcı Cari with SearchableSelect + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-dark-200">
                          Satıcı Cari (Tedarikçi)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAdd("supplier", "Yeni Cari Ekle")}
                          className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <TbPlus className="size-3.5" /> Yeni Cari
                        </button>
                      </div>
                      <Controller
                        name="supplierId"
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            options={supplierOptions}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onClear={() => field.onChange("")}
                            placeholder="Cari ara (İsim, VKN, TCKN, Telefon)..."
                          />
                        )}
                      />
                    </div>

                    {/* Başlangıç Lokasyonu with SearchableSelect */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
                        Başlangıç Lokasyonu
                      </label>
                      <Controller
                        name="purchaseLocationId"
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            options={locationOptions}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onClear={() => field.onChange("")}
                            placeholder="Lokasyon seçiniz..."
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ADIM 3: Tramer ve Notlar */}
            {activeStep === 3 && (
              <div className="space-y-6">
                {/* Tramer Kayıtları */}
                <div className="rounded-xl border border-gray-200 bg-white p-4.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                        Tramer Kayıtları ({tramerList.length})
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Hasar geçmişi, parça değişimi ve tramer kayıtları
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outlined"
                      className="gap-1 px-3 py-1.5 text-xs"
                      onClick={() => {
                        setTramerDate("");
                        setTramerAmount("");
                        setTramerDescription("");
                        setTramerPhotoUrl(null);
                        setShowTramerForm(true);
                      }}
                    >
                      <TbPlus className="size-4" /> Kayıt Ekle
                    </Button>
                  </div>

                  {/* Yeni Tramer Ekleme Formu */}
                  {showTramerForm && (
                    <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50/30 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input
                          label="Tarih *"
                          type="date"
                          value={tramerDate}
                          onChange={(e) => setTramerDate(e.target.value)}
                        />
                        <NumericInput
                          label="Tutar (₺) *"
                          placeholder="0,00"
                          value={tramerAmount}
                          onValueChange={(val) => setTramerAmount(val !== undefined ? String(val) : "")}
                        />
                        <Input
                          label="Açıklama"
                          placeholder="Hasar detayı, değişen parça..."
                          value={tramerDescription}
                          onChange={(e) => setTramerDescription(e.target.value)}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-primary-100 pt-3 dark:border-primary-900/30">
                        <div className="flex items-center gap-2">
                          <input
                            ref={tramerFileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleTramerFotoUpload}
                          />
                          <Button
                            type="button"
                            variant="outlined"
                            className="px-3 py-1.5 text-xs gap-1.5"
                            disabled={tramerUploading}
                            onClick={() => tramerFileRef.current?.click()}
                          >
                            {tramerUploading ? (
                              <Spinner className="size-4" />
                            ) : (
                              <TbCamera className="size-4" />
                            )}
                            {tramerPhotoUrl ? "Görsel Değiştir" : "Hasar Görseli Yükle"}
                          </Button>
                          {tramerPhotoUrl && (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              ✓ Görsel seçildi
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outlined"
                            className="px-3 py-1.5 text-xs"
                            onClick={() => setShowTramerForm(false)}
                          >
                            İptal
                          </Button>
                          <Button
                            type="button"
                            color="primary"
                            className="px-3 py-1.5 text-xs"
                            onClick={handleAddTramerRecord}
                          >
                            Kaydet
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tramer Kayıtları Listesi */}
                  {tramerList.length > 0 ? (
                    <div className="space-y-2">
                      {tramerList.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-3 transition hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-800/40"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              <TbTool className="size-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-mono text-gray-900 dark:text-dark-50">
                                  ₺
                                  {t.amount.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500 dark:text-dark-300">
                                  {t.date ? new Date(t.date).toLocaleDateString("tr-TR") : "—"}
                                </span>
                              </div>
                              {t.description && (
                                <p className="text-xs text-gray-600 dark:text-dark-200 mt-0.5">
                                  {t.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTramerRecord(t.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                            title="Kaydı Sil"
                          >
                            <TbTrash className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs text-gray-400 dark:text-dark-400">
                      Henüz tramer kaydı bulunmuyor.
                    </p>
                  )}
                </div>

                {/* Dahili Araç Notları */}
                <div className="rounded-xl border border-gray-200 bg-white p-4.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Dahili Araç Notları
                  </h4>
                  <Textarea
                    placeholder="Araçla ilgili şirket içi özel notlar, geçmiş durumlar veya hatırlatmalar..."
                    rows={4}
                    {...register("notes")}
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    Bu notlar sadece şirket içi kullanım içindir ve müşterilere gösterilmez.
                  </p>
                </div>
              </div>
            )}

            {/* ADIM 4: Evrak Yükleme */}
            {activeStep === 4 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-4.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Araç Evrakları
                  </h4>
                  {isEdit && vehicle ? (
                    <DocumentManager referenceType="VEHICLE" referenceId={vehicle.id} />
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/70 p-8 text-center dark:border-dark-500 dark:bg-dark-800/40">
                      <TbFileText className="mx-auto size-12 text-gray-400" />
                      <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-dark-100">
                        Araç Evraklarını Eklemek İçin Önce Aracı Kaydedin
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-dark-300 max-w-md mx-auto">
                        Ruhsat, Noter Alış Belgesi, Trafik Sigortası Poliçesi, Kasko ve Ekspertiz
                        Raporu gibi evraklar araç oluşturulduktan sonra yüklenebilir.
                      </p>
                      <Button
                        type="submit"
                        color="primary"
                        className="mt-4"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Kaydediliyor..." : "Aracı Kaydet ve Evrak Yükle"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation Controls */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3.5 dark:border-dark-600 dark:bg-dark-800">
          <Button type="button" variant="outlined" onClick={onClose}>
            İptal
          </Button>

          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <Button
                type="button"
                variant="outlined"
                onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
              >
                Geri
              </Button>
            )}

            {activeStep < STEPS.length - 1 && (
              <Button
                type="button"
                variant="outlined"
                onClick={() => setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1))}
              >
                İleri
              </Button>
            )}

            <Button type="submit" color="primary" disabled={isSubmitting}>
              {isSubmitting ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Aracı Kaydet"}
            </Button>
          </div>
        </div>
      </form>

      {/* Quick Add Modal */}
      {quickAddModal.open && (
        <Modal
          open={quickAddModal.open}
          onClose={() => setQuickAddModal((p) => ({ ...p, open: false }))}
          title={quickAddModal.title}
          className="max-w-md"
        >
          <div className="space-y-4">
            <Input
              label={
                quickAddModal.type === "supplier"
                  ? "Cari / Şirket Adı *"
                  : quickAddModal.type === "brand"
                    ? "Marka Adı *"
                    : quickAddModal.type === "model"
                      ? "Model Adı *"
                      : "Ad *"
              }
              placeholder="Adı yazınız..."
              value={quickAddModal.value}
              onChange={(e) => setQuickAddModal((p) => ({ ...p, value: e.target.value }))}
              autoFocus
            />

            {quickAddModal.type === "supplier" && (
              <Input
                label="Telefon Numarası"
                placeholder="05XX XXX XX XX"
                value={quickAddModal.extraValue ?? ""}
                onChange={(e) => setQuickAddModal((p) => ({ ...p, extraValue: e.target.value }))}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outlined"
                onClick={() => setQuickAddModal((p) => ({ ...p, open: false }))}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                color="primary"
                disabled={quickAddLoading || !quickAddModal.value.trim()}
                onClick={handleQuickAddSubmit}
              >
                {quickAddLoading ? "Ekleniyor..." : "Ekle"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
