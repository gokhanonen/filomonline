import { Link, useLocation, useSearchParams } from "react-router";
import clsx from "clsx";
import {
  FolderIcon,
  SwatchIcon,
  TruckIcon,
  TagIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CubeIcon,
  BuildingOffice2Icon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

export interface DefinitionTabItem {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const DEFINITION_TABS: DefinitionTabItem[] = [
  { id: "catalog", label: "Kategori / Marka / Model", to: "/catalog", icon: FolderIcon },
  { id: "colors", label: "Renkler", to: "/catalog?tab=colors", icon: SwatchIcon },
  { id: "body-types", label: "Kasa Tipleri", to: "/catalog?tab=body-types", icon: TruckIcon },
  { id: "vehicle-types", label: "Araç Tipleri", to: "/catalog?tab=vehicle-types", icon: TagIcon },
  { id: "listing-sources", label: "İlan Kaynakları", to: "/catalog?tab=listing-sources", icon: GlobeAltIcon },
  { id: "documents", label: "Evrak Tanımları", to: "/catalog?tab=documents", icon: DocumentTextIcon },
  { id: "accounts", label: "Cariler", to: "/accounts", icon: UserGroupIcon },
  { id: "products", label: "Malzeme & Hizmetler", to: "/products", icon: CubeIcon },
  { id: "company", label: "Firma", to: "/company", icon: BuildingOffice2Icon },
  { id: "locations", label: "Lokasyonlar", to: "/locations", icon: MapPinIcon },
];

export interface DefinitionsNavProps {
  activeId?: string;
  onTabChange?: (tabId: string) => void;
}

export function DefinitionsNav({ activeId, onTabChange }: DefinitionsNavProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Otomatik aktif sekme tespiti (prop verilmediyse)
  const currentActiveId =
    activeId ??
    (() => {
      const p = location.pathname;
      if (p.startsWith("/accounts")) return "accounts";
      if (p.startsWith("/products")) return "products";
      if (p.startsWith("/company")) return "company";
      if (p.startsWith("/locations")) return "locations";
      if (p.startsWith("/catalog")) {
        return searchParams.get("tab") || "catalog";
      }
      return "catalog";
    })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Tanımlar (Katalog)
          </h2>
          <p className="text-sm text-gray-500 dark:text-dark-300">
            Kategori › Marka › Model hiyerarşisi, renkler, kasa, araç tipleri, evrak, cariler, malzeme &amp; hizmetler, firma ve lokasyon tanımları
          </p>
        </div>
      </div>

      <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-200/80 dark:border-dark-700/80">
        {DEFINITION_TABS.map((t) => {
          const active = currentActiveId === t.id;
          const Icon = t.icon;
          return (
            <Link
              key={t.id}
              to={t.to}
              onClick={() => onTabChange?.(t.id)}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                active
                  ? "bg-primary-500 text-white shadow-xs shadow-primary-500/25 font-bold"
                  : "border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-gray-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-700 hover:border-gray-300 dark:hover:border-dark-600 shadow-xs"
              )}
            >
              <Icon
                className={clsx(
                  "size-4 shrink-0",
                  active ? "text-white" : "text-gray-500 dark:text-dark-400"
                )}
              />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
