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
  TbGauge,
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
import type { CatalogAll, SimpleCatalog } from "@/@types/catalog";
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
  ocrRegistration,
} from "@/services/vehicleService";
import { listAccounts, createAccount } from "@/services/accountService";
import { listLocations } from "@/services/locationService";
import { uploadBlob } from "@/services/storageService";
import { resizeWithThumbnail, DOCUMENT_PHOTO_MAX_BYTES } from "@/utils/imageResize";
import { VehiclePhotos } from "./VehiclePhotos";
import { DocumentManager } from "@/components/shared/DocumentManager";

const currentYear = new Date().getFullYear();

// Katalog yüklenene kadar veya veri eksikliğinde garantili renk havuzu
export const DEFAULT_COLORS: SimpleCatalog[] = [
  { id: "cmvl9c2iu0059ibcgfvn1evl1", name: "Beyaz", hex: "#FFFFFF" },
  { id: "cmvl9c2kj005bibcgdi698k4f", name: "Siyah", hex: "#000000" },
  { id: "cmvl9c2m2005dibcg8oh8in1l", name: "Gri", hex: "#808080" },
  { id: "cmvl9c2nn005fibcgplcwof4m", name: "Gümüş", hex: "#C0C0C0" },
  { id: "cmvl9c2pr005hibcg6zs4oolk", name: "Kırmızı", hex: "#D32F2F" },
  { id: "cmvl9c2r3005jibcgsd2v9844", name: "Mavi", hex: "#1976D2" },
  { id: "cmvl9c2st005libcga1ospnj7", name: "Lacivert", hex: "#1A237E" },
  { id: "cmvm6disa001bibpoaw3qpto6", name: "Bordo", hex: "#800020" },
  { id: "cmvm6diy8001fibpohwy4zwq9", name: "Kahverengi", hex: "#795548" },
  { id: "cmvm6dizn001hibpobgjia73q", name: "Bej", hex: "#F5F5DC" },
  { id: "cmvm6diww001dibpov94gyo39", name: "Yeşil", hex: "#2E7D32" },
  { id: "cmvm6dj0z001jibpobf2phmaq", name: "Turuncu", hex: "#FF9800" },
  { id: "cmvm6dj2c001libpo09wkdkfe", name: "Sarı", hex: "#FFEB3B" },
  { id: "cmvm6dj3o001nibpovy9gwwxt", name: "Mor", hex: "#9C27B0" },
  { id: "cmvm6dj58001pibpotqj9mf6x", name: "Beyaz Siyah", hex: "#ECEFF1" },
  { id: "cmvm6dj6r001ribpof6ke9dpo", name: "Mavi Siyah", hex: "#0D47A1" },
];

const schema = Yup.object().shape({
  plate: Yup.string()
    .trim()
    .required("Plaka zorunludur")
    .min(3, "Plaka en az 3 karakter olmalıdır"),
  status: Yup.string()
    .oneOf(["STOKTA", "KIRALAMADA", "SATILDI"], "Geçerli bir durum seçiniz")
    .required("Durum seçimi zorunludur"),
  categoryId: Yup.string().optional(),
  vehicleTypeId: Yup.string().optional(),
  brandId: Yup.string().trim().required("Marka seçimi zorunludur"),
  modelId: Yup.string().trim().required("Model seçimi zorunludur"),
  year: Yup.number()
    .typeError("Model yılı sayı olmalıdır")
    .required("Model yılı zorunludur")
    .min(1950, "Model yılı en az 1950 olabilir")
    .max(currentYear + 1, `Model yılı en fazla ${currentYear + 1} olabilir`),
  chassisNo: Yup.string().trim().optional(),
  engineNo: Yup.string().trim().optional(),
  erpCode: Yup.string().trim().optional(),
  registrationModel: Yup.string().trim().optional(),
  fuelType: Yup.string().trim().required("Yakıt tipi seçimi zorunludur"),
  transmission: Yup.string().trim().required("Vites tipi seçimi zorunludur"),
  driveType: Yup.string().optional(),
  km: Yup.number()
    .typeError("Kilometre sayı olmalıdır")
    .required("Kilometre bilgisi zorunludur")
    .min(0, "Kilometre negatif olamaz"),
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
  purchaseRegime: Yup.string()
    .oneOf(["sahis", "sirket_1", "sirket_20", "galeri_ozel"], "Geçersiz alım rejimi")
    .required("Alım rejimi zorunludur")
    .default("sahis"),
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

const FIELD_STEP_MAP: Record<string, number> = {
  plate: 0,
  status: 0,
  categoryId: 0,
  vehicleTypeId: 0,
  brandId: 0,
  modelId: 0,
  year: 0,
  erpCode: 0,
  registrationModel: 0,
  chassisNo: 0,
  engineNo: 0,

  km: 1,
  fuelType: 1,
  transmission: 1,
  driveType: 1,
  bodyTypeId: 1,
  colorId: 1,
  enginePower: 1,
  horsePower: 1,
  engineVolume: 1,
  warranty: 1,
  heavyDamage: 1,
  spareKey: 1,

  purchaseRegime: 2,
  purchasePrice: 2,
  purchaseNotaryPrice: 2,
  purchaseDate: 2,
  purchaseVatRate: 2,
  specialBase: 2,
  specialBaseAmount: 2,
  purchaseInvoiceNo: 2,
  purchaseInvoiceDate: 2,
  purchaseInvoiceDescription: 2,
  supplierId: 2,
  purchaseLocationId: 2,
  listPrice: 2,
  tensf: 2,

  notes: 4,
};

const FIELD_LABELS: Record<string, string> = {
  plate: "Plaka",
  status: "Durum",
  brandId: "Marka",
  modelId: "Model",
  year: "Model Yılı",
  km: "Kilometre",
  fuelType: "Yakıt",
  transmission: "Vites",
  purchaseRegime: "Alım Rejimi",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  vehicle?: Vehicle | null;
  isClone?: boolean;
}

const STEPS = [
  { id: 0, label: "Temel Bilgiler", icon: TbCar },
  { id: 1, label: "Teknik Özellikler", icon: TbGauge },
  { id: 2, label: "Finans", icon: TbCurrencyLira },
  { id: 3, label: "Görünüm & Durum", icon: TbCamera },
  { id: 4, label: "Tramer & Notlar", icon: TbTool },
  { id: 5, label: "Evrak Yükleme", icon: TbFileText },
];

export function VehicleForm({ open, onClose, onSaved, vehicle, isClone = false }: Props) {
  const isEdit = !!vehicle && !isClone;
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

  // Ruhsat OCR State
  const [ocrLoading, setOcrLoading] = useState(false);
  const ocrFileRef = useRef<HTMLInputElement>(null);

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
      if (data) setCatalog(data);
      return data;
    } catch (err) {
      console.warn("Katalog yüklenemedi:", err);
      return null;
    }
  };

  const reloadAccounts = async () => {
    try {
      const res = await listAccounts({ onlyActive: true, pageSize: 200 });
      setAccounts(res.items);
    } catch (err) {
      console.error("Cari hesaplar yüklenemedi:", err);
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

  // Bileşen mount edildiğinde önceden yükle
  useEffect(() => {
    reloadCatalog();
    reloadAccounts();
    reloadLocations();
  }, []);

  // Modal açıldığında kontrol et ve yenile
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      reloadCatalog();
      reloadAccounts();
      reloadLocations();
    }
  }, [open]);

  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setOcrLoading(true);
      toast.info("Ruhsat görseli yapay zeka ile taranıyor...");

      const { full } = await resizeWithThumbnail(file, 200 * 1024);
      const reader = new FileReader();

      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(full);
      });

      const ocrResult = await ocrRegistration(base64Data, full.type);
      if (!ocrResult) {
        toast.error("Ruhsat bilgileri okunamadı.");
        return;
      }

      if (ocrResult.brand && catalog?.brands) {
        const bTarget = ocrResult.brand.toLowerCase().trim();
        const brandObj = catalog.brands.find(
          (b) => b.name.toLowerCase().trim() === bTarget || bTarget.includes(b.name.toLowerCase().trim()),
        );
        if (brandObj) {
          setValue("brandId", brandObj.id);
          if (ocrResult.model && brandObj.models) {
            const mTarget = ocrResult.model.toLowerCase().trim();
            const modelObj = brandObj.models.find(
              (m) =>
                m.name.toLowerCase().trim() === mTarget || mTarget.includes(m.name.toLowerCase().trim()),
            );
            if (modelObj) {
              setValue("modelId", modelObj.id);
            }
          }
        }
      }

      if (ocrResult.plate) setValue("plate", ocrResult.plate.toUpperCase().trim());
      if (ocrResult.year) setValue("year", Number(ocrResult.year));
      if (ocrResult.vin) setValue("chassisNo", ocrResult.vin.toUpperCase().trim());
      if (ocrResult.engineNo) setValue("engineNo", ocrResult.engineNo.toUpperCase().trim());
      if (ocrResult.fuelType) {
        const ft = ocrResult.fuelType.toUpperCase();
        if (["BENZIN", "DIZEL", "ELEKTRIK", "HIBRIT", "LPG"].includes(ft)) {
          setValue("fuelType", ft as any);
        }
      }
      if (ocrResult.transmission) {
        const tr = ocrResult.transmission.toUpperCase();
        if (["OTOMATIK", "MANUEL"].includes(tr)) {
          setValue("transmission", tr as any);
        }
      }
      if (ocrResult.color) {
        const cTarget = ocrResult.color.toLowerCase().trim();
        const colorList = catalog?.colors?.length ? catalog.colors : DEFAULT_COLORS;
        const colorObj = colorList.find((c) => c.name.toLowerCase().includes(cTarget));
        if (colorObj) setValue("colorId", colorObj.id);
      }

      setActiveStep(0);
      toast.success(
        `Ruhsat başarıyla okundu: ${ocrResult.plate || ""} ${ocrResult.brand || ""} ${ocrResult.model || ""} forma aktarıldı.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Ruhsat okuma hatası.");
    } finally {
      setOcrLoading(false);
      if (e.target) e.target.value = "";
    }
  };

  // Form Resetleme / Veri doldurma
  useEffect(() => {
    if (open) {
      const isAiPrefill = Boolean((vehicle as any)?.brandName || (vehicle as any)?.modelName);

      let initialBrandId = vehicle?.brandId ?? "";
      let initialModelId = vehicle?.modelId ?? "";

      if (isAiPrefill && catalog?.brands) {
        const bName = String((vehicle as any).brandName || "").toLowerCase().trim();
        const foundBrand = catalog.brands.find(
          (b) => b.name.toLowerCase().trim() === bName || bName.includes(b.name.toLowerCase().trim()),
        );
        if (foundBrand) {
          initialBrandId = foundBrand.id;
          const mName = String((vehicle as any).modelName || "").toLowerCase().trim();
          const foundModel = foundBrand.models?.find(
            (m) =>
              m.name.toLowerCase().trim() === mName || mName.includes(m.name.toLowerCase().trim()),
          );
          if (foundModel) initialModelId = foundModel.id;
        }
      }

      const initialCatId =
        vehicle?.categoryId ||
        (initialBrandId && catalog?.brands?.find((b) => b.id === initialBrandId)?.categoryId) ||
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
        plate: isClone && !isAiPrefill ? "" : (vehicle?.plate ?? ""),
        status: isClone && !isAiPrefill ? "STOKTA" : (vehicle?.status ?? "STOKTA"),
        categoryId: initialCatId,
        vehicleTypeId: vehicle?.vehicleTypeId ?? "",
        brandId: initialBrandId,
        modelId: initialModelId,
        year: vehicle?.year ?? undefined,
        chassisNo: isClone && !isAiPrefill ? "" : (vehicle?.chassisNo ?? (vehicle as any)?.vin ?? ""),
        engineNo: isClone && !isAiPrefill ? "" : (vehicle?.engineNo ?? ""),
        erpCode: isClone && !isAiPrefill ? "" : (vehicle?.erpCode ?? ""),
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
        purchaseDate: isClone && !isAiPrefill ? "" : (vehicle?.purchaseDate ? vehicle.purchaseDate.slice(0, 10) : ""),
        purchaseRegime: determinedRegime,
        purchaseVatRate: vehicle?.purchaseVatRate != null ? Number(vehicle.purchaseVatRate) : cfg.purchaseVatRate,
        specialBase: vehicle?.specialBase != null ? vehicle.specialBase : cfg.specialBase,
        specialBaseAmount: vehicle?.specialBaseAmount ? Number(vehicle.specialBaseAmount) : undefined,
        purchaseInvoiceNo: isClone && !isAiPrefill ? "" : (vehicle?.purchaseInvoiceNo ?? ""),
        purchaseInvoiceDate: isClone && !isAiPrefill ? "" : (vehicle?.purchaseInvoiceDate ? vehicle.purchaseInvoiceDate.slice(0, 10) : ""),
        purchaseInvoiceDescription: isClone && !isAiPrefill ? "" : (vehicle?.purchaseInvoiceDescription ?? ""),
        supplierId: vehicle?.supplierId ?? "",
        purchaseLocationId: vehicle?.purchaseLocationId ?? "",
        notes: isClone && !isAiPrefill ? "" : (vehicle?.notes ?? ""),
      });

      // Tramer kayıtları (Klonlanan araç için sıfırlanır)
      if (!isClone && vehicle?.tramerSet) {
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
  }, [open, vehicle, catalog, reset, isClone]);

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
  const supplierOptions = useMemo<SearchableOption[]>(() => {
    const sorted = [...accounts].sort((a, b) => {
      if (a.type === "SUPPLIER" && b.type !== "SUPPLIER") return -1;
      if (a.type !== "SUPPLIER" && b.type === "SUPPLIER") return 1;
      return a.name.localeCompare(b.name, "tr");
    });
    return sorted.map((a) => ({
      value: a.id,
      label: a.name,
      subLabel: [a.taxNumber || a.tckn, a.phone].filter(Boolean).join(" • "),
      badge: a.type === "SUPPLIER" ? "Tedarikçi" : a.type === "CUSTOMER" ? "Müşteri" : "Cari",
    }));
  }, [accounts]);

  const locationOptions = useMemo<SearchableOption[]>(
    () =>
      locations.map((l) => ({
        value: l.id,
        label: l.name,
        subLabel: [l.code, l.city].filter(Boolean).join(" • "),
      })),
    [locations],
  );

  const colorOptions = useMemo<SearchableOption[]>(() => {
    const source =
      catalog?.colors && catalog.colors.length > 0 ? catalog.colors : DEFAULT_COLORS;
    const list = [...source];
    if (vehicle?.colorId && !list.some((c) => c.id === vehicle.colorId)) {
      list.unshift({
        id: vehicle.colorId,
        name: vehicle.colorName || "Mevcut Renk",
        hex: "#6B7280",
      });
    } else if (
      !vehicle?.colorId &&
      vehicle?.colorName &&
      !list.some((c) => c.name.toLowerCase() === vehicle.colorName!.toLowerCase())
    ) {
      list.unshift({
        id: vehicle.colorName,
        name: vehicle.colorName,
        hex: "#6B7280",
      });
    }
    return list.map((c) => ({
      value: c.id,
      label: c.name,
      colorHex: c.hex ?? undefined,
    }));
  }, [catalog?.colors, vehicle?.colorId, vehicle?.colorName]);

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
    const selectedColor = colorOptions.find((c) => c.value === values.colorId);
    const color = (catalog?.colors ?? DEFAULT_COLORS).find((c) => c.id === values.colorId);
    const resolvedColorName = color?.name || selectedColor?.label || vehicle?.colorName;

    const payload: VehicleFormValues & { tramerSet?: any[] } = {
      ...values,
      plate: values.plate.toUpperCase().trim(),
      brandName: (brand?.name ?? vehicle?.brandName) || undefined,
      modelName: (model?.name ?? vehicle?.modelName) || undefined,
      colorName: resolvedColorName || undefined,
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

  const onInvalid = (fieldErrors: Record<string, any>) => {
    const errorKeys = Object.keys(fieldErrors);
    if (errorKeys.length === 0) return;

    let minStep = 5;
    const errorNames: string[] = [];

    for (const key of errorKeys) {
      const step = FIELD_STEP_MAP[key] ?? 0;
      if (step < minStep) {
        minStep = step;
      }
      const label = FIELD_LABELS[key] || key;
      if (!errorNames.includes(label)) {
        errorNames.push(label);
      }
    }

    setActiveStep(minStep);
    toast.error(
      `Zorunlu alanlar doldurulmalıdır: ${errorNames.slice(0, 4).join(", ")}${
        errorNames.length > 4 ? ` (+${errorNames.length - 4})` : ""
      }`,
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      hideHeader
      noPadding
      className="w-full max-w-6xl h-[680px] max-h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden shadow-2xl rounded-2xl"
    >
      {/* Sticky Top Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50/95 px-5 py-2.5 backdrop-blur-xs dark:border-dark-600 dark:bg-dark-800/95">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
              {isClone ? "Araç Kopyalama (Yeni Kayıt)" : isEdit ? "Araç Düzenleme" : "Yeni Araç Kaydı"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="rounded-md border border-gray-300 bg-white px-2 py-0.5 font-mono text-sm font-bold text-gray-900 shadow-2xs dark:border-dark-500 dark:bg-dark-700 dark:text-dark-50">
                {plateVal || (isClone ? "YENİ PLAKA GİRİNİZ" : "PLAKA GİRİLMEDİ")}
              </span>
              {(currentBrand?.name || currentModel?.name) && (
                <span className="hidden text-xs font-semibold text-gray-700 dark:text-dark-100 sm:inline-block">
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
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
          {/* Stepper Sidebar */}
          <div className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50/60 p-2.5 overflow-y-auto dark:border-dark-600 dark:bg-dark-800/40">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isCurrent = activeStep === step.id;
                const isPassed = activeStep > step.id || isEdit || isClone;
                const hasError = Object.keys(errors).some((key) => FIELD_STEP_MAP[key] === step.id);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (isEdit || isClone || step.id <= activeStep + 1) {
                        setActiveStep(step.id);
                      }
                    }}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition shrink-0 md:w-full ${
                      isCurrent
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 shadow-2xs"
                        : hasError
                          ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                          : isPassed
                            ? "text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-700/60"
                            : "text-gray-400 opacity-60 cursor-not-allowed dark:text-dark-400"
                    }`}
                  >
                    <div
                      className={`flex size-5.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        hasError
                          ? "bg-red-600 text-white"
                          : isCurrent
                            ? "bg-primary-600 text-white"
                            : isPassed
                              ? "bg-emerald-600 text-white"
                              : "border border-gray-300 text-gray-500 dark:border-dark-500 dark:text-dark-400"
                      }`}
                    >
                      {hasError ? "!" : isPassed && !isCurrent ? <TbCheck className="size-3" /> : step.id + 1}
                    </div>
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{step.label}</span>
                    {hasError && (
                      <span className="ml-auto flex size-2 rounded-full bg-red-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steps Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4.5 space-y-3.5">
            {/* ADIM 0: Temel Bilgiler */}
            {activeStep === 0 && (
              <div className="space-y-3.5">
                {/* RUHSAT OCR İLE OTOMATİK DOLDURMA KARTI */}
                {!isEdit && (
                  <div className="relative overflow-hidden rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50 via-purple-50/50 to-white p-3.5 shadow-2xs dark:border-primary-900/50 dark:bg-dark-750">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-sm">
                          <TbCamera className="size-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-dark-50">
                            Ruhsat Fotoğrafı ile Otomatik Doldur
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-dark-300">
                            Ruhsat fotoğrafını yükleyin; plaka, şasi, motor, marka ve model otomatik doldurulsun.
                          </p>
                        </div>
                      </div>

                      <div>
                        <input
                          type="file"
                          ref={ocrFileRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleOcrFileChange}
                        />
                        <Button
                          type="button"
                          color="primary"
                          onClick={() => ocrFileRef.current?.click()}
                          disabled={ocrLoading}
                          className="w-full sm:w-auto text-xs font-bold shadow-xs flex items-center gap-1.5"
                        >
                          {ocrLoading ? (
                            <>
                              <Spinner className="size-4 text-white" />
                              <span>Ruhsat Okunuyor...</span>
                            </>
                          ) : (
                            <>
                              <TbCamera className="size-4" />
                              <span>Ruhsat Fotoğrafı Seç / Çek</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Genel Araç Bilgileri */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Genel Araç Bilgileri
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Plaka */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Plaka *
                        </label>
                      </div>
                      <Input
                        placeholder="34 ABC 123"
                        className="h-10 text-xs font-bold uppercase tracking-wider font-mono"
                        {...register("plate")}
                        error={errors.plate?.message}
                      />
                    </div>

                    {/* Durum */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Durum *
                        </label>
                      </div>
                      <select
                        {...register("status")}
                        className={`block h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-2xs focus:outline-hidden dark:bg-dark-700 dark:text-dark-100 ${
                          errors.status
                            ? "border-red-500 focus:border-red-500"
                            : "border-gray-300 focus:border-primary-500 dark:border-dark-500"
                        }`}
                      >
                        <option value="STOKTA">Stokta</option>
                        <option value="KIRALAMADA">Kiralamada</option>
                        <option value="SATILDI">Satıldı</option>
                      </select>
                      {errors.status && (
                        <p className="mt-1 text-[11px] font-medium text-red-500">{errors.status.message}</p>
                      )}
                    </div>

                    {/* Kategori + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
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
                        className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
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
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Marka *
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
                          setValue("brandId", newBrandId, { shouldValidate: true });
                          setValue("modelId", "", { shouldValidate: true });
                          if (!categoryIdVal && newBrandId) {
                            const b = catalog?.brands.find((x) => x.id === newBrandId);
                            if (b?.categoryId) setValue("categoryId", b.categoryId);
                          }
                        }}
                        className={`block h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:outline-hidden dark:bg-dark-700 dark:text-dark-100 ${
                          errors.brandId
                            ? "border-red-500 focus:border-red-500"
                            : "border-gray-300 focus:border-primary-500 dark:border-dark-500"
                        }`}
                      >
                        <option value="">Seçiniz</option>
                        {filteredBrands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      {errors.brandId && (
                        <p className="mt-1 text-[11px] font-medium text-red-500">{errors.brandId.message}</p>
                      )}
                    </div>

                    {/* Model + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Model *
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
                        onChange={(e) => setValue("modelId", e.target.value, { shouldValidate: true })}
                        disabled={!brandIdVal}
                        className={`block h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:outline-hidden disabled:bg-gray-100 disabled:opacity-60 dark:bg-dark-700 dark:text-dark-100 ${
                          errors.modelId
                            ? "border-red-500 focus:border-red-500"
                            : "border-gray-300 focus:border-primary-500 dark:border-dark-500"
                        }`}
                      >
                        <option value="">{brandIdVal ? "Seçiniz" : "Önce Marka Seçiniz"}</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      {errors.modelId && (
                        <p className="mt-1 text-[11px] font-medium text-red-500">{errors.modelId.message}</p>
                      )}
                    </div>

                    {/* Araç Tipi + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
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
                        className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">Seçiniz</option>
                        {catalog?.vehicleTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Yıl */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Model Yılı *
                        </label>
                      </div>
                      <Input
                        type="number"
                        placeholder="2024"
                        className="h-10 text-xs"
                        {...register("year", { valueAsNumber: true })}
                        error={errors.year?.message}
                      />
                    </div>

                    {/* ERP Kodu */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          ERP Kodu
                        </label>
                      </div>
                      <Input
                        placeholder="ERP Stok / Referans Kodu"
                        className="h-10 text-xs font-mono"
                        {...register("erpCode")}
                      />
                    </div>

                    {/* Ruhsat Model Adı */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Ruhsat Model Adı
                        </label>
                      </div>
                      <Input
                        placeholder="Ruhsatta yazan tam model adı"
                        className="h-10 text-xs"
                        {...register("registrationModel")}
                      />
                    </div>
                  </div>
                </div>

                {/* Şase ve Motor Tanımlayıcıları - Geniş 2 Kolon */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
                      Şase ve Motor Tanımlayıcıları
                    </h4>
                    <span className="text-[11px] text-gray-400">17 haneli VIN ve motor seri numarası</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Şase No (VIN)
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">17 Hane</span>
                      </div>
                      <Input
                        placeholder="WBA31AY00PFP12345"
                        className="h-10 text-xs font-mono font-semibold uppercase tracking-wider"
                        {...register("chassisNo")}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Motor No
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">Motor Seri</span>
                      </div>
                      <Input
                        placeholder="ENG200009"
                        className="h-10 text-xs font-mono font-semibold uppercase tracking-wider"
                        {...register("engineNo")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ADIM 1: Teknik Özellikler */}
            {activeStep === 1 && (
              <div className="space-y-3.5">
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
                      Teknik Özellikler
                    </h4>
                    <span className="text-[11px] text-gray-400">Motor, şanzıman ve performans değerleri</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* KM */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Kilometre *
                        </label>
                      </div>
                      <Controller
                        name="km"
                        control={control}
                        render={({ field }) => (
                          <NumericInput
                            suffix="km"
                            placeholder="0"
                            options={{ numeralDecimalScale: 0 }}
                            value={field.value}
                            onValueChange={field.onChange}
                            className="h-10 text-xs font-mono"
                            error={errors.km?.message}
                          />
                        )}
                      />
                    </div>

                    {/* Yakıt */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Yakıt Tipi *
                        </label>
                      </div>
                      <select
                        {...register("fuelType")}
                        className={`block h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:outline-hidden dark:bg-dark-700 dark:text-dark-100 ${
                          errors.fuelType
                            ? "border-red-500 focus:border-red-500"
                            : "border-gray-300 focus:border-primary-500 dark:border-dark-500"
                        }`}
                      >
                        <option value="">Seçiniz</option>
                        {Object.entries(FUEL_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      {errors.fuelType && (
                        <p className="mt-1 text-[11px] font-medium text-red-500">{errors.fuelType.message}</p>
                      )}
                    </div>

                    {/* Vites */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Vites Tipi *
                        </label>
                      </div>
                      <select
                        {...register("transmission")}
                        className={`block h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:outline-hidden dark:bg-dark-700 dark:text-dark-100 ${
                          errors.transmission
                            ? "border-red-500 focus:border-red-500"
                            : "border-gray-300 focus:border-primary-500 dark:border-dark-500"
                        }`}
                      >
                        <option value="">Seçiniz</option>
                        {Object.entries(TRANSMISSION_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      {errors.transmission && (
                        <p className="mt-1 text-[11px] font-medium text-red-500">{errors.transmission.message}</p>
                      )}
                    </div>

                    {/* Kasa Tipi + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
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
                        className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
                      >
                        <option value="">Seçiniz</option>
                        {catalog?.bodyTypes.map((bt) => (
                          <option key={bt.id} value={bt.id}>
                            {bt.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Motor Gücü (kW) */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Motor Gücü (kW)
                        </label>
                        <span className="text-[10px] text-gray-400 font-mono">1 kW ≈ 1.36 HP</span>
                      </div>
                      <Controller
                        name="enginePower"
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            placeholder="kW"
                            className="h-10 text-xs font-mono"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                field.onChange(undefined);
                                setValue("horsePower", undefined, { shouldDirty: true });
                              } else {
                                const kw = Number(raw);
                                field.onChange(isNaN(kw) ? undefined : kw);
                                if (!isNaN(kw) && kw > 0) {
                                  setValue("horsePower", Math.round(kw * 1.35962), { shouldDirty: true });
                                }
                              }
                            }}
                          />
                        )}
                      />
                    </div>

                    {/* Motor Gücü (HP) */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Motor Gücü (HP)
                        </label>
                        <span className="text-[10px] text-gray-400 font-mono">Beygir Gücü</span>
                      </div>
                      <Controller
                        name="horsePower"
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            placeholder="HP"
                            className="h-10 text-xs font-mono"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                field.onChange(undefined);
                                setValue("enginePower", undefined, { shouldDirty: true });
                              } else {
                                const hp = Number(raw);
                                field.onChange(isNaN(hp) ? undefined : hp);
                                if (!isNaN(hp) && hp > 0) {
                                  setValue("enginePower", Math.round(hp / 1.35962), { shouldDirty: true });
                                }
                              }
                            }}
                          />
                        )}
                      />
                    </div>

                    {/* Motor Hacmi (cc) */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Motor Hacmi (cc)
                        </label>
                      </div>
                      <Input
                        type="number"
                        placeholder="1600"
                        className="h-10 text-xs font-mono"
                        {...register("engineVolume", { valueAsNumber: true })}
                      />
                    </div>

                    {/* Çekiş */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Çekiş
                        </label>
                      </div>
                      <select
                        {...register("driveType")}
                        className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
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

            {/* ADIM 2: Finans */}
            {activeStep === 2 && (
              <div className="space-y-3.5">
                {/* 1. Alış ve Satıcı Bilgileri (Tedarikçi en üstte) */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
                      Satıcı Cari & Alış Bilgileri
                    </h4>
                    <span className="text-[11px] text-gray-400">Tedarikçi, başlangıç lokasyonu ve alım bedelleri</span>
                  </div>

                  {/* Satıcı Cari + Lokasyon + Tarih */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Satıcı Cari with SearchableSelect + Quick Add */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
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
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Başlangıç Lokasyonu
                        </label>
                      </div>
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

                    {/* Alış Tarihi */}
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Alış Tarihi
                        </label>
                      </div>
                      <Input
                        type="date"
                        className="h-10 text-xs"
                        {...register("purchaseDate")}
                      />
                    </div>
                  </div>

                  {/* Alış Fiyatları + Noter + Canlı Fark (3 Kolon) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2.5 border-t border-gray-100 dark:border-dark-600">
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Alış Fiyatı (₺)
                        </label>
                      </div>
                      <Controller
                        name="purchasePrice"
                        control={control}
                        render={({ field }) => (
                          <NumericInput
                            placeholder="0,00"
                            value={field.value}
                            onValueChange={field.onChange}
                            className="h-10 text-xs font-mono"
                            error={errors.purchasePrice?.message}
                          />
                        )}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Alış Noter Fiyatı (₺)
                        </label>
                      </div>
                      <Controller
                        name="purchaseNotaryPrice"
                        control={control}
                        render={({ field }) => (
                          <NumericInput
                            placeholder="0,00"
                            value={field.value}
                            onValueChange={field.onChange}
                            className="h-10 text-xs font-mono"
                            error={errors.purchaseNotaryPrice?.message}
                          />
                        )}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Fark (Alış - Noter)
                        </label>
                      </div>
                      <div
                        className={`flex h-10 items-center justify-end rounded-lg border px-3 text-xs font-bold font-mono ${
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
                  </div>
                </div>

                {/* 2. Alım Rejimi, KDV ve Satış Fiyatlandırması */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
                      Alım Rejimi, KDV & Satış Fiyatlandırması
                    </h4>
                    <span className="text-[11px] text-gray-400">Vergi rejimi ve vitrin satış fiyatları</span>
                  </div>

                  {/* Rejim Satırı (3 Kolon) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Alım Rejimi *
                        </label>
                      </div>
                      <select
                        value={currentRegime}
                        onChange={(e) => handleRegimeChange(e.target.value as PurchaseRegime)}
                        className={`block h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-2xs focus:outline-hidden dark:bg-dark-700 dark:text-dark-100 ${
                          errors.purchaseRegime
                            ? "border-red-500 focus:border-red-500"
                            : "border-gray-300 focus:border-primary-500 dark:border-dark-500"
                        }`}
                      >
                        <option value="sahis">Şahıstan (Özel Matrah Yok)</option>
                        <option value="sirket_1">Şirketten (%1 KDV)</option>
                        <option value="sirket_20">Şirketten (%20 KDV)</option>
                        <option value="galeri_ozel">Galeriden (Özel Matrahlı)</option>
                      </select>
                      {errors.purchaseRegime && (
                        <p className="mt-1 text-[11px] font-medium text-red-500">{errors.purchaseRegime.message}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Alış KDV Oranı (Kilitli)
                        </label>
                      </div>
                      <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-700 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-200">
                        %{regimeConfig.purchaseVatRate}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Satış KDV Yansıması
                        </label>
                      </div>
                      <div className="flex h-10 items-center truncate rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-primary-700 dark:border-dark-500 dark:bg-dark-800 dark:text-primary-400">
                        {regimeConfig.salesVatEffect}
                      </div>
                    </div>
                  </div>

                  {/* Fatura Bilgileri (Şirket Alımları için) */}
                  {(currentRegime === "sirket_1" || currentRegime === "sirket_20") && (
                    <div className="border-t border-gray-100 pt-2.5 dark:border-dark-600">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <div className="flex items-center justify-between h-5 mb-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                              Fatura No
                            </label>
                          </div>
                          <Input
                            placeholder="ABC20240000123"
                            className="h-10 text-xs font-mono uppercase"
                            {...register("purchaseInvoiceNo")}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between h-5 mb-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                              Fatura Tarihi
                            </label>
                          </div>
                          <Input
                            type="date"
                            className="h-10 text-xs"
                            {...register("purchaseInvoiceDate")}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between h-5 mb-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                              Fatura Açıklaması
                            </label>
                          </div>
                          <Input
                            placeholder="Fatura açıklaması..."
                            className="h-10 text-xs"
                            {...register("purchaseInvoiceDescription")}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Galeri Özel Matrah - 4 Kolonlu Tam Hizalı Düzen */}
                  {currentRegime === "galeri_ozel" && (
                    <div className="border-t border-gray-100 pt-2.5 dark:border-dark-600">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <div className="flex items-center justify-between h-5 mb-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                              Fatura No
                            </label>
                          </div>
                          <Input
                            placeholder="ABC20240000123"
                            className="h-10 text-xs font-mono uppercase"
                            {...register("purchaseInvoiceNo")}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between h-5 mb-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                              Fatura Tarihi
                            </label>
                          </div>
                          <Input
                            type="date"
                            className="h-10 text-xs"
                            {...register("purchaseInvoiceDate")}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between h-5 mb-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                              Özel Matrah Tutarı (₺) *
                            </label>
                          </div>
                          <Controller
                            name="specialBaseAmount"
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                placeholder="0,00"
                                value={field.value}
                                onValueChange={field.onChange}
                                className="h-10 text-xs font-mono"
                                error={errors.specialBaseAmount?.message}
                              />
                            )}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between h-5 mb-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                              Fatura Açıklaması
                            </label>
                          </div>
                          <Input
                            placeholder="Fatura açıklaması..."
                            className="h-10 text-xs"
                            {...register("purchaseInvoiceDescription")}
                          />
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">
                        * Önceki galerinin faturasında belirtilen özel matrah tutarı
                      </p>
                    </div>
                  )}

                  {/* Satış & Vitrin Fiyatları (3 Kolon: Liste Fiyatı + TENSF + Mevzuat Açıklaması) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2.5 border-t border-gray-100 dark:border-dark-600">
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Liste Fiyatı (₺)
                        </label>
                      </div>
                      <Controller
                        name="listPrice"
                        control={control}
                        render={({ field }) => (
                          <NumericInput
                            placeholder="0,00"
                            value={field.value}
                            onValueChange={field.onChange}
                            className="h-10 text-xs font-mono"
                            error={errors.listPrice?.message}
                          />
                        )}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          TENSF (₺)
                        </label>
                      </div>
                      <Controller
                        name="tensf"
                        control={control}
                        render={({ field }) => (
                          <NumericInput
                            placeholder="0,00"
                            value={field.value}
                            onValueChange={field.onChange}
                            className="h-10 text-xs font-mono"
                            error={errors.tensf?.message}
                          />
                        )}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Rejim & Vergi Notu
                        </label>
                      </div>
                      <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50/80 px-3 text-[11px] leading-tight text-gray-600 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-300">
                        {regimeConfig.description}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ADIM 3: Görünüm ve Durum */}
            {activeStep === 3 && (
              <div className="space-y-3.5">
                {/* Araç Fotoğrafları (Kapak, İç, Dış Tabları) */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
                      Araç Fotoğrafları
                    </h4>
                    <span className="text-[11px] text-gray-400">Kapak, iç ve dış araç görselleri</span>
                  </div>
                  {isEdit && vehicle ? (
                    <VehiclePhotos vehicleId={vehicle.id} />
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/70 p-4 text-center dark:border-dark-500 dark:bg-dark-800/40">
                      <TbCamera className="mx-auto size-8 text-gray-400" />
                      <p className="mt-1.5 text-xs font-medium text-gray-700 dark:text-dark-200">
                        Fotoğrafları araç kaydedildikten sonra yükleyebilirsiniz.
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Kapak fotoğrafı (1 adet), iç ve dış fotoğraflar kategorili olarak saklanır ve
                        otomatik optimize edilir.
                      </p>
                    </div>
                  )}
                </div>

                {/* Renk & Durum Özellikleri (Switches) */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
                      Renk ve Donanım Durumu
                    </h4>
                    <span className="text-[11px] text-gray-400">Gövde rengi ve güvenlik/donanım anahtarları</span>
                  </div>

                  <div className="max-w-xs">
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
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
                    <Controller
                      name="colorId"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={colorOptions}
                          value={field.value || ""}
                          onChange={(val) => {
                            field.onChange(val);
                          }}
                          placeholder="Renk Seçiniz..."
                        />
                      )}
                    />
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

            {/* ADIM 4: Tramer ve Notlar */}
            {activeStep === 4 && (
              <div className="space-y-3.5">
                {/* Tramer Kayıtları */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
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
                    <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50/30 p-3.5 dark:border-primary-900/40 dark:bg-primary-950/20">
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
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
                      Dahili Araç Notları
                    </h4>
                    <span className="text-[11px] text-gray-400">Yalnızca şirket içi kullanım içindir</span>
                  </div>
                  <Textarea
                    placeholder="Araçla ilgili şirket içi özel notlar, geçmiş durumlar veya hatırlatmalar..."
                    rows={3}
                    className="text-xs"
                    {...register("notes")}
                  />
                </div>
              </div>
            )}

            {/* ADIM 5: Evrak Yükleme */}
            {activeStep === 5 && (
              <div className="space-y-3.5">
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-dark-600 dark:bg-dark-700">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
                      Araç Evrakları
                    </h4>
                    <span className="text-[11px] text-gray-400">Ruhsat, sigorta, kasko ve ekspertiz</span>
                  </div>
                  {isEdit && vehicle ? (
                    <DocumentManager referenceType="VEHICLE" referenceId={vehicle.id} />
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/70 p-6 text-center dark:border-dark-500 dark:bg-dark-800/40">
                      <TbFileText className="mx-auto size-10 text-gray-400" />
                      <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-dark-100">
                        Araç Evraklarını Eklemek İçin Önce Aracı Kaydedin
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-dark-300 max-w-md mx-auto">
                        Ruhsat, Noter Alış Belgesi, Trafik Sigortası Poliçesi, Kasko ve Ekspertiz
                        Raporu gibi evraklar araç oluşturulduktan sonra yüklenebilir.
                      </p>
                      <Button
                        type="submit"
                        color="primary"
                        className="mt-3 px-3.5 py-1.5 text-xs font-semibold"
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

        {/* Bottom Navigation Controls - Fixed Sticky Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50/95 px-5 py-2.5 backdrop-blur-xs dark:border-dark-600 dark:bg-dark-800">
          <Button
            type="button"
            variant="outlined"
            className="px-3.5 py-1.5 text-xs font-semibold"
            onClick={onClose}
          >
            İptal
          </Button>

          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <Button
                type="button"
                variant="outlined"
                className="px-3.5 py-1.5 text-xs font-semibold"
                onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
              >
                Geri
              </Button>
            )}

            {activeStep < STEPS.length - 1 && (
              <Button
                type="button"
                variant="outlined"
                className="px-3.5 py-1.5 text-xs font-semibold"
                onClick={() => setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1))}
              >
                İleri
              </Button>
            )}

            <Button
              type="submit"
              color="primary"
              className="px-4 py-1.5 text-xs font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Kaydediliyor..."
                : isEdit
                  ? "Güncelle"
                  : isClone
                    ? "Kopyayı Kaydet"
                    : "Aracı Kaydet"}
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
