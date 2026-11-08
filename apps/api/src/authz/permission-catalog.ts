/**
 * Merkezi izin kataloğu — tek doğruluk kaynağı.
 * Hem backend (seed, doğrulama) hem frontend (rol editörü) bunu kullanır
 * (frontend GET /authz/catalog ile çeker).
 *
 * İki tür izin var:
 *  1) Eylem izinleri: `modul.read|write|delete` — bir şeyi görme/düzenleme/silme.
 *  2) Hassas-veri scope'ları: `data.*.view` — maliyet/kâr/finans gibi alanları GÖRME.
 *     Scope YOKSA ilgili alanlar API yanıtından çıkarılır (sunucu) ve UI'da gizlenir.
 */

export type ActionKey = "read" | "create" | "write" | "delete";

export interface ModuleDef {
  key: string;
  label: string;
  actions: ActionKey[];
}

/**
 * Eylem izinli modüller. Eylemler: read (görüntüle) · create (ekle) · write (düzenle) · delete (sil).
 * KURAL: `write` (düzenle) `create`'i (ekle) KAPSAR — düzenleyebilen ekleyebilir de
 * (CompanyGuard + frontend can() bunu otomatik genişletir). `create`-only rol, yalnız
 * ekleyip düzenleyemeyen kullanıcılar için.
 */
export const MODULES: ModuleDef[] = [
  { key: "vehicles", label: "Araçlar / Operasyon", actions: ["read", "create", "write", "delete"] },
  { key: "crm", label: "CRM / Potansiyeller", actions: ["read", "create", "write", "delete"] },
  { key: "accounts", label: "Cari (Müşteri/Tedarikçi)", actions: ["read", "create", "write", "delete"] },
  { key: "invoices", label: "Faturalar (Alış/Satış)", actions: ["read", "create", "write", "delete"] },
  { key: "expenses", label: "Masraflar", actions: ["read", "create", "write", "delete"] },
  { key: "finance", label: "Finans (Kasa/Banka/Çek)", actions: ["read", "create", "write", "delete"] },
  { key: "rentals", label: "Kiralama", actions: ["read", "create", "write", "delete"] },
  { key: "contracts", label: "Sözleşmeler", actions: ["read", "create", "write", "delete"] },
  { key: "products", label: "Hizmet / Ürün / Parça", actions: ["read", "create", "write", "delete"] },
  { key: "locations", label: "Lokasyonlar", actions: ["read", "create", "write"] },
  { key: "documents", label: "Evraklar", actions: ["read", "create", "write", "delete"] },
  { key: "reports", label: "Raporlar", actions: ["read"] },
  { key: "catalog", label: "Tanımlar (Katalog)", actions: ["create", "write"] },
];

/**
 * `write` ⇒ `create` genişletmesi. Bir kullanıcının etkin izinleri hesaplandıktan sonra,
 * `X.write` varsa `X.create` de eklenir. Hem CompanyGuard (backend) hem auth/Provider (frontend)
 * aynı fonksiyonu kullanır ki eski roller (yalnız write) create endpoint'lerinde kırılmasın.
 */
export function expandImpliedPermissions(perms: string[]): string[] {
  const set = new Set(perms);
  for (const p of perms) {
    if (p.endsWith(".write")) set.add(p.slice(0, -".write".length) + ".create");
  }
  return [...set];
}

export interface DataScopeDef {
  key: string;
  label: string;
  description: string;
}

/** Hassas-veri görünürlük scope'ları (yoksa alanlar gizlenir). */
export const DATA_SCOPES: DataScopeDef[] = [
  {
    key: "data.cost.view",
    label: "Maliyet / Alış tutarları",
    description: "Alış fiyatı, alış noter, alış KDV, özel matrah, masraf maliyetleri.",
  },
  {
    key: "data.profit.view",
    label: "Kârlılık / Marj",
    description: "Kâr tutarı, kâr marjı, matrah, raporlardaki kârlılık.",
  },
  {
    key: "data.finance.view",
    label: "Finans & Cari bakiyeler",
    description: "Kasa/banka/çek bakiyeleri, cari (müşteri/tedarikçi) bakiyeleri, kredi limiti.",
  },
  {
    key: "data.salePrice.view",
    label: "Satış / Liste fiyatları",
    description: "Liste fiyatı, satış tutarı, TENSF, teklif tutarları.",
  },
  {
    key: "data.contact.view",
    label: "İletişim bilgileri",
    description: "Müşteri/tedarikçi telefon ve e-posta bilgileri (KVKK).",
  },
];

/**
 * Özel yetkiler — modül CRUD'una ya da hassas-veri scope'una girmeyen, davranış
 * genişleten izinler (rol editöründe switch olarak gösterilir).
 */
export const SPECIAL_PERMISSIONS: DataScopeDef[] = [
  {
    key: "reports.all",
    label: "Tüm temsilcilerin raporu",
    description:
      "Raporlarda yalnız kendi verisi yerine TÜM satış temsilcilerinin verisini görür. Yoksa kullanıcı raporlarda yalnız kendi performansını görür.",
  },
];

/** API yanıtından, scope yoksa çıkarılacak alan adları (scope → alanlar). */
export const SCOPE_FIELDS: Record<string, string[]> = {
  "data.cost.view": [
    "purchasePrice",
    "purchaseNotaryPrice",
    "purchaseVatRate",
    "purchaseNotaryAmount",
    "specialBaseAmount",
    "notaryPurchasePrice",
    "costAmount",
    "unitCost",
    "costPrice",
  ],
  "data.profit.view": ["profitMargin", "matrah", "profit", "grossProfit", "margin"],
  "data.finance.view": [
    "balance",
    "openingBalance",
    "currentBalance",
    "creditLimit",
    "totalDebit",
    "totalCredit",
  ],
  "data.salePrice.view": [
    "listPrice",
    "salePrice",
    "saleAmount",
    "saleNotaryAmount",
    "tensf",
    "tenListPrice",
    "offeredPrice",
  ],
  "data.contact.view": ["phone", "email"],
};

/** URL yolu bu öneklerden biriyle başlıyorsa alan gizleme UYGULANMAZ. */
export const VISIBILITY_SKIP_PREFIXES = [
  "auth",
  "users",
  "roles",
  "authz",
  "admin",
  "holding",
  "party",
  "credits",
  "subscription",
  "payments",
  "ai",
  "settings",
  "company",
  "companies",
  "tenants",
];

export function allPermissionKeys(): string[] {
  const actions = MODULES.flatMap((m) => m.actions.map((a) => `${m.key}.${a}`));
  const scopes = DATA_SCOPES.map((s) => s.key);
  const special = SPECIAL_PERMISSIONS.map((s) => s.key);
  return [...actions, ...scopes, ...special];
}

export interface RolePreset {
  name: string;
  description: string;
  permissions: string[];
}

/** Hazır rol şablonları (seed + "şablondan oluştur"). */
export const ROLE_PRESETS: RolePreset[] = [
  {
    name: "Yönetici",
    description: "Tüm yetkiler ve tüm hassas veriler.",
    permissions: ["*"],
  },
  {
    name: "Satış Danışmanı",
    description: "Araç ve CRM işlemleri + satış fiyatı/iletişim. Maliyet/kâr/finans GÖRMEZ.",
    permissions: [
      "vehicles.read",
      "vehicles.write",
      "crm.read",
      "crm.write",
      "accounts.read",
      "documents.read",
      "documents.write",
      "locations.read",
      "data.salePrice.view",
      "data.contact.view",
    ],
  },
  {
    name: "Muhasebe",
    description: "Finans, fatura, masraf, cari + tüm hassas finansal veriler.",
    permissions: [
      "finance.read",
      "finance.write",
      "finance.delete",
      "invoices.read",
      "invoices.write",
      "invoices.delete",
      "expenses.read",
      "expenses.write",
      "expenses.delete",
      "accounts.read",
      "accounts.write",
      "reports.read",
      "reports.all",
      "vehicles.read",
      "data.cost.view",
      "data.profit.view",
      "data.finance.view",
      "data.salePrice.view",
      "data.contact.view",
    ],
  },
  {
    name: "Görüntüleyici",
    description: "Yalnız görüntüleme; hassas veri yok.",
    permissions: [
      "vehicles.read",
      "crm.read",
      "accounts.read",
      "documents.read",
      "locations.read",
      "data.salePrice.view",
    ],
  },
];

export const DEFAULT_NEW_USER_ROLE = "Satış Danışmanı";
