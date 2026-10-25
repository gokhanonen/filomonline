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
      { id: "leads", type: "item", path: "/crm/leads", title: "Potansiyeller", icon: "leads" },
      { id: "test-drives", type: "item", path: "/crm/test-drives", title: "Deneme Sürüşleri", icon: "testDrives" },
      { id: "quotes", type: "item", path: "/crm/quotes", title: "Teklifler", icon: "quotes" },
    ],
  },
  {
    id: "finance",
    type: "root",
    path: "/finance/accounts",
    title: "Finans",
    icon: "finance",
    childs: [
      { id: "finance-accounts", type: "item", path: "/finance/accounts", title: "Kasa & Banka", icon: "cashBank" },
      { id: "finance-movements", type: "item", path: "/finance/movements", title: "Hareketler", icon: "financeMovements" },
      { id: "finance-cheques", type: "item", path: "/finance/cheques", title: "Çek & Senet", icon: "cheques" },
      { id: "finance-receivables", type: "item", path: "/finance/receivables", title: "Alacak & Borç", icon: "receivables" },
      { id: "finance-statement", type: "item", path: "/finance/statement", title: "Cari Ekstre", icon: "statement" },
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
      { id: "catalog", type: "item", path: "/catalog", title: "Tanımlar", icon: "catalog" },
      { id: "settings", type: "item", path: "/settings", title: "Ayarlar", icon: "settings" },
    ],
  },
];

// Not: Holding (tenant) ve firma (company) açma/yönetme süper-admin'e özel
// AYRI bir yönetim konsolunda olacak (sol menüde değil). Günlük firma değiştirme
// ise sağ üstteki CompanySwitcher combobox'ı ile yapılır.
