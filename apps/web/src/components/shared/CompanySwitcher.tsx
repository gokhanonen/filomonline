import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  BuildingOffice2Icon,
  BuildingOfficeIcon,
  CheckIcon,
  ChevronUpDownIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useLocation, useNavigate } from "react-router";

import { useAuthContext } from "@/app/contexts/auth/context";
import { useFileUrl } from "@/services/storageService";

function CompanyLogo({ logoUrl, className }: { logoUrl?: string | null; className?: string }) {
  const url = useFileUrl(logoUrl);
  if (url) {
    return (
      <img
        src={url}
        alt="Logo"
        className={clsx("rounded object-contain shrink-0 bg-white dark:bg-dark-800 p-0.5 border border-gray-200 dark:border-dark-500", className)}
      />
    );
  }
  return <BuildingOffice2Icon className={clsx("shrink-0 text-primary-600 dark:text-primary-400", className)} />;
}

/**
 * Sağ üstteki Firma → Lokasyon ağaç seçicisi.
 * Holding (tenant) başlığı altında her firmayı ve firmaya bağlı lokasyonları listeler.
 * Lokasyon seçimi aktif firma + aktif lokasyonu (X-Company-Id + X-Location-Id) belirler;
 * "Tüm Firmalar (Konsolide)" /holding sayfasına gider. Sistem artık lokasyon bazlı çalışır.
 */
export function CompanySwitcher() {
  const {
    companies,
    activeCompanyId,
    activeLocationId,
    switchLocation,
    switchCompany,
    holdingName,
  } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();

  if (!companies.length) return null;

  const onHolding = location.pathname.startsWith("/holding");
  const active = companies.find((c) => c.id === activeCompanyId) ?? companies[0];
  const activeLoc = active?.locations?.find((l) => l.id === activeLocationId);

  const label = onHolding
    ? `${holdingName ?? "Holding"} · Tüm Firmalar`
    : activeLoc
      ? `${active?.name} · ${activeLoc.name}`
      : active?.name;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className="flex h-9 items-center gap-2 rounded-full border border-gray-200 px-3 text-xs-plus font-medium text-gray-700 hover:border-gray-400 dark:border-dark-500 dark:text-dark-100 dark:hover:border-dark-400"
      >
        {onHolding ? (
          <BuildingOfficeIcon className="size-5 shrink-0 text-primary-600 dark:text-primary-400" />
        ) : (
          <CompanyLogo logoUrl={active?.logoUrl} className="size-5" />
        )}
        <span className="max-w-56 truncate">{label}</span>
        <ChevronUpDownIcon className="size-4 shrink-0 text-gray-400" />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-100 mt-1 max-h-[70vh] w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none dark:border-dark-500 dark:bg-dark-700"
      >
        {holdingName && (
          <div className="px-3 py-1.5 text-tiny-plus font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
            {holdingName}
          </div>
        )}

        {/* Konsolide (tüm firmalar) */}
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              onClick={() => navigate("/holding")}
              className={clsx(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                focus && "bg-gray-100 dark:bg-dark-600",
                onHolding
                  ? "font-medium text-primary-600 dark:text-primary-400"
                  : "text-gray-700 dark:text-dark-100",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BuildingOfficeIcon className="size-5 shrink-0" />
                <span className="truncate">Tüm Firmalar (Konsolide)</span>
              </div>
              {onHolding && <CheckIcon className="size-4 shrink-0" />}
            </button>
          )}
        </MenuItem>

        <div className="my-1 border-t border-gray-100 dark:border-dark-600" />

        {/* Firma → Lokasyon ağacı */}
        {companies.map((c) => {
          const locs = c.locations ?? [];
          return (
            <div key={c.id} className="py-0.5">
              {/* Firma başlığı */}
              <div className="flex items-center gap-2 px-3 py-1.5">
                <CompanyLogo logoUrl={c.logoUrl} className="size-4" />
                <span className="truncate text-tiny-plus font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-200">
                  {c.name}
                </span>
              </div>

              {/* Lokasyonlar */}
              {locs.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    switchCompany(c.id);
                    if (onHolding) navigate("/dashboard");
                  }}
                  className="flex w-full items-center gap-2 py-1.5 pl-9 pr-3 text-left text-sm text-gray-400 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-600"
                >
                  <MapPinIcon className="size-4 shrink-0" />
                  <span className="truncate">Lokasyon yok — firmayı seç</span>
                </button>
              ) : (
                locs.map((l) => {
                  const isActive =
                    !onHolding && c.id === active?.id && l.id === activeLocationId;
                  return (
                    <MenuItem key={l.id}>
                      {({ focus }) => (
                        <button
                          type="button"
                          onClick={() => {
                            switchLocation(c.id, l.id);
                            if (onHolding) navigate("/dashboard");
                          }}
                          className={clsx(
                            "flex w-full items-center justify-between gap-2 py-1.5 pl-9 pr-3 text-left text-sm",
                            focus && "bg-gray-100 dark:bg-dark-600",
                            isActive
                              ? "font-medium text-primary-600 dark:text-primary-400"
                              : "text-gray-700 dark:text-dark-100",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <MapPinIcon
                              className={clsx(
                                "size-4 shrink-0",
                                l.isExternal && "text-amber-500",
                              )}
                            />
                            <span className="truncate">{l.name}</span>
                            {l.isExternal && (
                              <span className="shrink-0 rounded bg-amber-100 px-1 text-tiny text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                                Dış
                              </span>
                            )}
                          </div>
                          {isActive && <CheckIcon className="size-4 shrink-0" />}
                        </button>
                      )}
                    </MenuItem>
                  );
                })
              )}
            </div>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
