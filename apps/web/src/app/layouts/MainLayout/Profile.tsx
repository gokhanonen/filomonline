// Import Dependencies
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import {
  ArrowLeftStartOnRectangleIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { TbUser } from "react-icons/tb";
import { Link, useNavigate } from "react-router";

// Local Imports
import { Avatar, Button } from "@/components/ui";
import { ColorType } from "@/constants/app";
import { useAuthContext } from "@/app/contexts/auth/context";

// Define Link Types
interface LinkItem {
  id: string;
  title: string;
  description: string;
  to: string;
  Icon: React.ElementType;
  color: ColorType;
}

const links: LinkItem[] = [
  {
    id: "1",
    title: "Profilim",
    description: "Hesap bilgileriniz",
    to: "/settings/general",
    Icon: TbUser,
    color: "warning",
  },
  {
    id: "2",
    title: "Ayarlar",
    description: "Uygulama ayarları",
    to: "/settings/appearance",
    Icon: Cog6ToothIcon,
    color: "success",
  },
];

function initialsOf(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// ----------------------------------------------------------------------

export function Profile() {
  const { user, logout, isSuperAdmin } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <Popover className="relative">
      <PopoverButton
        as={Avatar}
        size={12}
        role="button"
        initialColor="primary"
        alt="Profil"
        className="cursor-pointer"
      >
        {initialsOf(user?.name)}
      </PopoverButton>
      <Transition
        enter="duration-200 ease-out"
        enterFrom="translate-x-2 opacity-0"
        enterTo="translate-x-0 opacity-100"
        leave="duration-200 ease-out"
        leaveFrom="translate-x-0 opacity-100"
        leaveTo="translate-x-2 opacity-0"
      >
        <PopoverPanel
          anchor={{ to: "right end", gap: 12 }}
          className="z-70 flex w-64 flex-col rounded-lg border border-gray-150 bg-white shadow-soft transition dark:border-dark-600 dark:bg-dark-700 dark:shadow-none"
        >
          {({ close }) => (
            <>
              {/* Kullanıcı bilgisi */}
              <div className="flex items-center gap-4 rounded-t-lg bg-gray-100 px-4 py-5 dark:bg-dark-800">
                <Avatar size={14} initialColor="primary" alt="Profil">
                  {initialsOf(user?.name)}
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-gray-700 dark:text-dark-100">
                    {user?.name ?? "Kullanıcı"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-dark-300">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Menü linkleri */}
              <div className="flex flex-col pb-5 pt-2">
                {isSuperAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => close()}
                    className="group flex items-center gap-3 px-4 py-2 tracking-wide outline-hidden transition-all hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-dark-600 dark:focus:bg-dark-600"
                  >
                    <Avatar size={8} initialColor="primary" classNames={{ display: "rounded-lg" }}>
                      <BuildingOffice2Icon className="size-4.5" />
                    </Avatar>
                    <div>
                      <h2 className="font-medium text-gray-800 transition-colors group-hover:text-primary-600 dark:text-dark-100 dark:group-hover:text-primary-400">
                        Platform Yönetimi
                      </h2>
                      <div className="truncate text-xs text-gray-400 dark:text-dark-300">
                        Holding ve firma yönetimi
                      </div>
                    </div>
                  </Link>
                )}
                {links.map((link) => (
                  <Link
                    key={link.id}
                    to={link.to}
                    onClick={() => close()}
                    className="group flex items-center gap-3 px-4 py-2 tracking-wide outline-hidden transition-all hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-dark-600 dark:focus:bg-dark-600"
                  >
                    <Avatar
                      size={8}
                      initialColor={link.color}
                      classNames={{ display: "rounded-lg" }}
                    >
                      <link.Icon className="size-4.5" />
                    </Avatar>
                    <div>
                      <h2 className="font-medium text-gray-800 transition-colors group-hover:text-primary-600 group-focus:text-primary-600 dark:text-dark-100 dark:group-hover:text-primary-400 dark:group-focus:text-primary-400">
                        {link.title}
                      </h2>
                      <div className="truncate text-xs text-gray-400 dark:text-dark-300">
                        {link.description}
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Çıkış */}
                <div className="px-4 pt-4">
                  <Button
                    className="w-full gap-2"
                    color="error"
                    onClick={() => {
                      close();
                      void handleLogout();
                    }}
                  >
                    <ArrowLeftStartOnRectangleIcon className="size-4.5" />
                    <span>Çıkış Yap</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}
