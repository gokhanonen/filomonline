export type VehicleStatus = "STOKTA" | "KIRALAMADA" | "SATILDI";
export type FuelType = "BENZIN" | "DIZEL" | "LPG" | "ELEKTRIK" | "HIBRIT";
export type TransmissionType = "MANUEL" | "OTOMATIK" | "YARI_OTOMATIK";
export type DriveType = "ONDEN_CEKIS" | "ARKADAN_ITIS" | "FOUR_WD" | "AWD";

export interface VehiclePhoto {
  id: string;
  category: "COVER" | "INTERIOR" | "EXTERIOR";
  fileKey: string;
  thumbKey?: string | null;
  url?: string | null;
  thumbUrl?: string | null;
  sortOrder: number;
}

export interface VehicleListingUrl {
  id: string;
  vehicleId: string;
  listingSourceId?: string | null;
  url: string;
  createdAt: string;
}

export type VehicleOptionStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "CONVERTED"
  | "SUPERSEDED";

/** Opsiyon (kapora / rezervasyon) */
export interface VehicleOption {
  id: string;
  vehicleId: string;
  customerId: string;
  customerName?: string | null;
  optionDate: string;
  validUntil: string;
  amount: string; // Decimal -> string
  note?: string | null;
  status: VehicleOptionStatus;
  createdAt: string;
  cancelledAt?: string | null;
  convertedAt?: string | null;
}

export interface VehicleTramerRecord {
  id: string;
  date: string;
  amount: string;
  description: string;
  photoUrl?: string | null;
}

export interface Vehicle {
  id: string;
  companyId: string;
  status: VehicleStatus;
  isActive: boolean;
  plate: string;
  categoryId?: string | null;
  vehicleTypeId?: string | null;
  brandId?: string | null;
  modelId?: string | null;
  brandName?: string | null;
  modelName?: string | null;
  year?: number | null;
  chassisNo?: string | null;
  engineNo?: string | null;
  erpCode?: string | null;
  registrationModel?: string | null;
  fuelType?: FuelType | null;
  transmission?: TransmissionType | null;
  km?: number | null;
  bodyTypeId?: string | null;
  colorId?: string | null;
  colorName?: string | null;
  driveType?: DriveType | null;
  horsePower?: number | null;
  enginePower?: number | null;
  engineVolume?: number | null;
  warranty: boolean;
  heavyDamage: boolean;
  spareKey: boolean;
  notes?: string | null;
  listPrice?: string | null;
  tensf?: string | null; // TENSF
  purchasePrice?: string | null;
  purchaseNotaryPrice?: string | null; // Alış Noter Fiyatı
  purchaseRegime?: PurchaseRegime | null;
  specialBase?: boolean;
  specialBaseAmount?: string | null;
  purchaseVatRate?: string | null;
  purchaseInvoiceNo?: string | null;
  purchaseInvoiceDate?: string | null;
  purchaseInvoiceDescription?: string | null;
  purchaseDate?: string | null;
  supplierId?: string | null;
  purchaseLocationId?: string | null;
  saleAmount?: string | null;
  saleNotaryAmount?: string | null;
  saleDate?: string | null;
  photos?: VehiclePhoto[];
  tramerSet?: VehicleTramerRecord[];
  listingUrls?: VehicleListingUrl[];
  activeOption?: VehicleOption | null;
  coverUrl?: string | null; // liste için imzalı kapak foto URL'i
  createdAt: string;
  updatedAt: string;
}

export type PurchaseRegime = "sahis" | "sirket_1" | "sirket_20" | "galeri_ozel";

export const PURCHASE_REGIME_CONFIG: Record<
  PurchaseRegime,
  {
    label: string;
    purchaseVatRate: number;
    specialBase: boolean;
    salesVatEffect: string;
    description: string;
  }
> = {
  sahis: {
    label: "Şahıstan (Özel Matrah Yok)",
    purchaseVatRate: 0,
    specialBase: false,
    salesVatEffect: "Kâr marjı üzerinden %20 (Özel Matrah)",
    description: "Vergi mükellefi olmayan şahıstan alım. Fatura kesilmez (noter sözleşmesi / gider pusulası esas alınır).",
  },
  sirket_1: {
    label: "Şirketten (%1 KDV)",
    purchaseVatRate: 1,
    specialBase: false,
    salesVatEffect: "Tam Fatura (%1 KDV dahil)",
    description: "Binek aracı aktifinde bulunduran şirketten %1 KDV'li fatura ile alım.",
  },
  sirket_20: {
    label: "Şirketten (%20 KDV)",
    purchaseVatRate: 20,
    specialBase: false,
    salesVatEffect: "Tam Fatura (%20 KDV dahil)",
    description: "Ticari araç veya rent-a-car şirketinden %20 KDV'li fatura ile alım.",
  },
  galeri_ozel: {
    label: "Galeriden (Özel Matrahlı)",
    purchaseVatRate: 0,
    specialBase: true,
    salesVatEffect: "Tam Fatura (%1 KDV dahil)",
    description: "Yetkili galeriden özel matrahlı fatura ile alım. Alış Özel Matrah Tutarı girilir.",
  },
};

export interface VehicleFormValues {
  plate: string;
  status: VehicleStatus;
  categoryId?: string;
  vehicleTypeId?: string;
  brandId?: string;
  modelId?: string;
  brandName?: string;
  modelName?: string;
  year?: number;
  chassisNo?: string;
  engineNo?: string;
  erpCode?: string;
  registrationModel?: string;
  fuelType?: FuelType | "";
  transmission?: TransmissionType | "";
  driveType?: DriveType | "";
  km?: number;
  bodyTypeId?: string;
  colorId?: string;
  colorName?: string;
  horsePower?: number;
  enginePower?: number; // Kw
  engineVolume?: number;
  warranty?: boolean;
  heavyDamage?: boolean;
  spareKey?: boolean;
  listPrice?: number;
  tensf?: number; // TENSF
  purchasePrice?: number;
  purchaseNotaryPrice?: number; // Alış Noter Fiyatı
  purchaseRegime?: PurchaseRegime;
  specialBase?: boolean;
  specialBaseAmount?: number;
  purchaseVatRate?: number;
  purchaseInvoiceNo?: string;
  purchaseInvoiceDate?: string;
  purchaseInvoiceDescription?: string;
  purchaseDate?: string;
  supplierId?: string;
  purchaseLocationId?: string;
  saleAmount?: number;
  notes?: string;
}

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  STOKTA: "Stokta",
  KIRALAMADA: "Kiralamada",
  SATILDI: "Satıldı",
};

export const FUEL_LABELS: Record<FuelType, string> = {
  BENZIN: "Benzin",
  DIZEL: "Dizel",
  LPG: "LPG",
  ELEKTRIK: "Elektrik",
  HIBRIT: "Hibrit",
};

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  MANUEL: "Manuel",
  OTOMATIK: "Otomatik",
  YARI_OTOMATIK: "Yarı Otomatik",
};

export const DRIVE_LABELS: Record<DriveType, string> = {
  ONDEN_CEKIS: "Önden Çekiş",
  ARKADAN_ITIS: "Arkadan İtiş",
  FOUR_WD: "4WD",
  AWD: "AWD",
};

export const OPTION_STATUS_LABELS: Record<VehicleOptionStatus, string> = {
  ACTIVE: "Aktif",
  EXPIRED: "Süresi Doldu",
  CANCELLED: "İptal",
  CONVERTED: "Satışa Dönüştü",
  SUPERSEDED: "Güncellendi",
};

export const STATUS_TAG_COLOR: Record<
  VehicleStatus,
  "success" | "warning" | "neutral"
> = {
  STOKTA: "success",
  KIRALAMADA: "warning",
  SATILDI: "neutral",
};

export interface VehicleShareLink {
  id: string;
  vehicleId: string;
  companyId: string;
  token: string;
  title?: string | null;
  hidePlate: boolean;
  customPrice?: number | null;
  customNote?: string | null;
  viewCount: number;
  lastViewedAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleShareLinkInput {
  title?: string;
  hidePlate?: boolean;
  customPrice?: number;
  customNote?: string;
}

export interface PublicVehiclePhoto {
  id: string;
  category: string;
  url?: string | null;
  thumbUrl?: string | null;
  sortOrder: number;
}

export interface PublicVehicle {
  id: string;
  plate: string;
  brandName?: string | null;
  modelName?: string | null;
  year?: number | null;
  km?: number | null;
  fuelType?: FuelType | null;
  transmission?: TransmissionType | null;
  colorName?: string | null;
  horsePower?: number | null;
  enginePower?: number | null;
  engineVolume?: number | null;
  driveType?: DriveType | null;
  bodyTypeId?: string | null;
  warranty: boolean;
  spareKey: boolean;
  heavyDamage: boolean;
  notes?: string | null;
  listPrice?: number | null;
  photos: PublicVehiclePhoto[];
  tramerSet: { id: string; date: string; amount: number; description: string }[];
  isReserved?: boolean;
  options?: { id: string; status: string; note?: string | null }[];
}

export interface PublicCompany {
  name: string;
  legalName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}

export type PublicVehicleResponse =
  | {
      status: "active";
      token: string;
      title?: string | null;
      customNote?: string | null;
      hidePlate: boolean;
      vehicle: PublicVehicle;
      company: PublicCompany | null;
    }
  | {
      status: "disabled";
      reason: "SOLD" | "INACTIVE";
      message: string;
      vehicleSummary?: {
        brandName?: string | null;
        modelName?: string | null;
        year?: number | null;
        plate?: string | null;
      };
      company?: {
        name?: string;
        phone?: string | null;
        logoUrl?: string | null;
        address?: string | null;
      } | null;
    };

