// Import Dependencies
import {
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  Squares2X2Icon,
  TruckIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { ComponentType } from "react";

// Local Imports
import { Avatar, type AvatarProps } from "@/components/ui";
import { Link, type To } from "react-router";

// ----------------------------------------------------------------------

interface AppItem {
  id: string;
  Icon: ComponentType<{ className?: string }>;
  title: string;
  color: AvatarProps["initialColor"];
  to: To;
}

const apps: AppItem[] = [
  {
    id: "vehicles",
    Icon: TruckIcon,
    title: "Araçlar",
    color: "primary",
    to: "/vehicles",
  },
  {
    id: "contracts",
    Icon: DocumentTextIcon,
    title: "Sözleşmeler",
    color: "secondary",
    to: "/contracts",
  },
  {
    id: "accounts",
    Icon: UserGroupIcon,
    title: "Cariler",
    color: "warning",
    to: "/accounts",
  },
  {
    id: "crm",
    Icon: UserPlusIcon,
    title: "CRM / Potansiyel",
    color: "success",
    to: "/crm/leads",
  },
  {
    id: "invoices",
    Icon: BanknotesIcon,
    title: "Faturalar",
    color: "info",
    to: "/invoices",
  },
  {
    id: "expenses",
    Icon: ReceiptPercentIcon,
    title: "Masraflar",
    color: "error",
    to: "/expenses",
  },
  {
    id: "catalog",
    Icon: Squares2X2Icon,
    title: "Tanımlar",
    color: "neutral",
    to: "/catalog",
  },
  {
    id: "chat",
    Icon: ChatBubbleLeftRightIcon,
    title: "Sohbet",
    color: "info",
    to: "/chat",
  },
];

export function Apps({ close }: { close: () => void }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-3">
        <h2 className="text-xs-plus dark:text-dark-100 line-clamp-1 font-medium tracking-wide text-gray-800">
          Hızlı Menü & Uygulamalar
        </h2>
        <span className="text-[10px] text-gray-400 dark:text-dark-300">
          Kaydırılabilir
        </span>
      </div>
      <div className="mt-2.5 flex gap-3 overflow-x-auto hide-scrollbar px-3 pb-1 scroll-smooth">
        {apps.map((app) => (
          <Link
            key={app.id}
            to={app.to}
            onClick={close}
            className="group w-14 shrink-0 text-center transition-transform hover:-translate-y-0.5"
          >
            <Avatar
              size={11}
              initialColor={app.color}
              classNames={{
                display: "mask is-squircle rounded-none shadow-xs group-hover:shadow-md transition-shadow",
              }}
            >
              <app.Icon className="size-5.5 text-white" />
            </Avatar>
            <span className="dark:text-dark-100 mt-1.5 block truncate text-[11px] font-medium text-gray-700 group-hover:text-primary-600 dark:group-hover:text-primary-400">
              {app.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
