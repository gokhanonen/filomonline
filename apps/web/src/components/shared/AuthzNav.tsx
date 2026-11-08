import { Link } from "react-router";
import clsx from "clsx";
import { UsersIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export interface AuthzTabItem {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const AUTHZ_TABS: AuthzTabItem[] = [
  { id: "users", label: "Kullanıcılar", to: "/users", icon: UsersIcon },
  { id: "roles", label: "Roller", to: "/users?tab=roles", icon: ShieldCheckIcon },
];

/** Yetkilendirme sekme çubuğu (Kullanıcılar / Roller) — Tanımlar sekme yapısıyla aynı stil. */
export function AuthzNav({ activeId }: { activeId: string }) {
  return (
    <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-gray-200/80 pb-2 dark:border-dark-700/80">
      {AUTHZ_TABS.map((t) => {
        const active = activeId === t.id;
        const Icon = t.icon;
        return (
          <Link
            key={t.id}
            to={t.to}
            className={clsx(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              active
                ? "bg-primary-500 font-bold text-white shadow-xs shadow-primary-500/25"
                : "border border-gray-200 bg-white text-gray-700 shadow-xs hover:border-gray-300 hover:bg-gray-50 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-200 dark:hover:border-dark-600 dark:hover:bg-dark-700",
            )}
          >
            <Icon
              className={clsx(
                "size-4 shrink-0",
                active ? "text-white" : "text-gray-500 dark:text-dark-400",
              )}
            />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
