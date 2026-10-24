import { NavigationTree } from "@/@types/navigation";

/**
 * FilomOnline ana navigasyonu. Metin doğrudan `title`'dan gelir (transKey yok).
 * Her `icon` anahtarı navigationIcons'ta kayıtlı olmalıdır.
 *
 * Not: Erişim/rol bazlı filtreleme (süper admin → Yönetim segmenti vb.)
 * sidebar render katmanında `can()` ile ileride uygulanacak.
 */
export const navigation: NavigationTree[] = [
  {
    id: "operations",
    type: "root",
    path: "/dashboard",
    title: "Operasyon",
    icon: "dashboard",
    childs: [
      { id: "dashboard", type: "item", path: "/dashboard", title: "Dashboard", icon: "dashboard" },
      { id: "vehicles", type: "item", path: "/vehicles", title: "Operasyon", icon: "vehicles" },
    ],
  },
  {
    id: "crm",
    type: "root",
    path: "/crm/leads",
    title: "CRM",
    icon: "crm",
    childs: [
      { id: "leads", type: "item", path: "/crm/leads", title: "Adaylar", icon: "leads" },
      { id: "test-drives", type: "item", path: "/crm/test-drives", title: "Deneme Sürüşleri", icon: "testDrives" },
      { id: "quotes", type: "item", path: "/crm/quotes", title: "Teklifler", icon: "quotes" },
    ],
  },
  {
    id: "finance",
    type: "root",
    path: "/expenses",
    title: "Finans",
    icon: "finance",
    childs: [
      { id: "invoices", type: "item", path: "/invoices", title: "Faturalar", icon: "invoices" },
      { id: "expenses", type: "item", path: "/expenses", title: "Masraflar", icon: "expenses" },
      { id: "contracts", type: "item", path: "/contracts", title: "Sözleşmeler", icon: "contracts" },
    ],
  },
  {
    id: "administration",
    type: "root",
    path: "/settings",
    title: "Yönetim",
    icon: "settings",
    childs: [
      { id: "users", type: "item", path: "/users", title: "Kullanıcılar", icon: "users" },
      {
        id: "catalog",
        type: "collapse",
        path: "/definitions",
        title: "Tanımlar",
        icon: "catalog",
        childs: [
          {
            id: "catalog-general",
            type: "item",
            path: "/catalog",
            title: "Genel Tanımlar",
            icon: "catalog",
          },
          {
            id: "accounts",
            type: "item",
            path: "/accounts",
            title: "Cariler",
            icon: "accounts",
          },
          {
            id: "products",
            type: "item",
            path: "/products",
            title: "Malzeme / Hizmet",
            icon: "products",
          },
          {
            id: "company",
            type: "item",
            path: "/company",
            title: "Firma",
            icon: "company",
          },
          {
            id: "locations",
            type: "item",
            path: "/locations",
            title: "Lokasyonlar",
            icon: "locations",
          },
        ],
      },
      { id: "settings", type: "item", path: "/settings", title: "Ayarlar", icon: "settings" },
    ],
  },
];

// Not: Holding (tenant) ve firma (company) açma/yönetme süper-admin'e özel
// AYRI bir yönetim konsolunda olacak (sol menüde değil). Günlük firma değiştirme
// ise sağ üstteki CompanySwitcher combobox'ı ile yapılır.
