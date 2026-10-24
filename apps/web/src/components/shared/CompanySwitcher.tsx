import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { BuildingOffice2Icon, CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

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
 * Sağ üstteki firma değiştir combobox'ı.
 * Kullanıcının yetkili olduğu firmaları (aktif holdingin altındaki şirketler)
 * listeler; seçim X-Company-Id olarak tüm isteklere yansır (switchCompany).
 */
export function CompanySwitcher() {
  const { companies, activeCompanyId, switchCompany } = useAuthContext();

  if (!companies.length) return null;

  const active = companies.find((c) => c.id === activeCompanyId) ?? companies[0];
  const single = companies.length === 1;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        disabled={single}
        className={clsx(
          "flex h-9 items-center gap-2 rounded-full border border-gray-200 px-3 text-xs-plus font-medium text-gray-700 dark:border-dark-500 dark:text-dark-100",
          !single && "hover:border-gray-400 dark:hover:border-dark-400",
        )}
      >
        <CompanyLogo logoUrl={active?.logoUrl} className="size-5" />
        <span className="max-w-40 truncate">{active?.name}</span>
        {!single && <ChevronUpDownIcon className="size-4 shrink-0 text-gray-400" />}
      </MenuButton>

      {!single && (
        <MenuItems
          anchor="bottom end"
          className="z-100 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none dark:border-dark-500 dark:bg-dark-700"
        >
          <div className="px-3 py-1.5 text-tiny-plus font-medium uppercase tracking-wide text-gray-400 dark:text-dark-300">
            Firma seç
          </div>
          {companies.map((c) => (
            <MenuItem key={c.id}>
              {({ focus }) => (
                <button
                  type="button"
                  onClick={() => switchCompany(c.id)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                    focus && "bg-gray-100 dark:bg-dark-600",
                    c.id === active?.id
                      ? "font-medium text-primary-600 dark:text-primary-400"
                      : "text-gray-700 dark:text-dark-100",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CompanyLogo logoUrl={c.logoUrl} className="size-5" />
                    <span className="truncate">{c.name}</span>
                  </div>
                  {c.id === active?.id && <CheckIcon className="size-4 shrink-0" />}
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      )}
    </Menu>
  );
}
