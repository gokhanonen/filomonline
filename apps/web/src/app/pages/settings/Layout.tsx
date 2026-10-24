// Import Dependencies
import { Outlet, NavLink } from "react-router";
import clsx from "clsx";
import {
  UserIcon,
  PaintBrushIcon,
  BellIcon,
  CreditCardIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Card } from "@/components/ui";

// ----------------------------------------------------------------------

const SETTINGS_TABS = [
  { path: "/settings/general", label: "Genel Profil", icon: UserIcon },
  { path: "/settings/appearance", label: "Görünüm & Tema", icon: PaintBrushIcon },
  { path: "/settings/notifications", label: "Bildirimler", icon: BellIcon },
  { path: "/settings/billing", label: "Faturalandırma", icon: CreditCardIcon },
  { path: "/settings/applications", label: "Entegrasyonlar", icon: Squares2X2Icon },
  { path: "/settings/sessions", label: "Güvenlik & Şifre", icon: ShieldCheckIcon },
];

export default function SettingsLayout() {
  return (
    <Page title="Ayarlar">
      <div className="w-full px-(--margin-x) py-6">
        {/* Başlık */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-50">Ayarlar</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Kullanıcı profilinizi, tema ve uygulama tercihlerinizi bu ekrandan yönetebilirsiniz.
          </p>
        </div>

        {/* Tab Menüsü */}
        <div className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto border-b border-gray-200 pb-3 dark:border-dark-600">
          {SETTINGS_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                clsx(
                  "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary-600 text-white shadow-xs font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                )
              }
            >
              <tab.icon className="size-4.5" />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Aktif Ayar İçeriği */}
        <Card className="w-full p-6 sm:p-8">
          <Outlet />
        </Card>
      </div>
    </Page>
  );
}
