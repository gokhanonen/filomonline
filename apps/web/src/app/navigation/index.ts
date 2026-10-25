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
    id: "dashboard",
    type: "item",
    path: "/dashboard",
    title: "Dashboard",
    icon: "dashboard",
  },
  {
    id: "vehicles",
    type: "item",
    path: "/vehicles",
    title: "Operasyon",
    icon: "vehicles",
  },
  {
    id: "crm",
    type: "item",
    path: "/crm/leads",
    title: "CRM",
    icon: "crm",
  },
  {
    id: "finance",
    type: "item",
    path: "/finance",
    title: "Finans",
    icon: "finance",
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
