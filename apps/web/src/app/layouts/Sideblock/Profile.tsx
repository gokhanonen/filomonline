// Import Dependencies
import React from "react";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import {
  ArrowLeftStartOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { TbUser } from "react-icons/tb";
import { Link, useNavigate } from "react-router";

// Local Imports
import { Avatar, type AvatarProps, Button } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

interface LinkItem {
  id: string;
  title: string;
  description: string;
  to: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: AvatarProps["initialColor"];
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

export function Profile() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <Popover className="relative flex">
      <PopoverButton
        as={Avatar}
        size={9}
        role="button"
        initialColor="primary"
        className="cursor-pointer"
      >
        {initialsOf(user?.name)}
      </PopoverButton>
      <Transition
        enter="duration-200 ease-out"
        enterFrom="translate-y-2 opacity-0"
        enterTo="translate-y-0 opacity-100"
        leave="duration-200 ease-out"
        leaveFrom="translate-y-0 opacity-100"
        leaveTo="translate-y-2 opacity-0"
      >
        <PopoverPanel
          anchor={{ to: "bottom end", gap: 12 }}
          className="border-gray-150 shadow-soft dark:border-dark-600 dark:bg-dark-700 z-70 flex w-64 flex-col rounded-lg border bg-white transition dark:shadow-none"
        >
          {({ close }: { close: () => void }) => (
            <>
              <div className="dark:bg-dark-800 flex items-center gap-4 rounded-t-lg bg-gray-100 px-4 py-5">
                <Avatar size={14} initialColor="primary">
                  {initialsOf(user?.name)}
                </Avatar>
                <div className="min-w-0">
                  <p className="dark:text-dark-100 truncate text-base font-medium text-gray-700">
                    {user?.name ?? "Kullanıcı"}
                  </p>
                  <p className="dark:text-dark-300 mt-0.5 truncate text-xs text-gray-400">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-col pt-2 pb-5">
                {links.map((link) => (
                  <Link
                    key={link.id}
                    to={link.to}
                    onClick={close}
                    className="group dark:hover:bg-dark-600 dark:focus:bg-dark-600 flex items-center gap-3 px-4 py-2 tracking-wide outline-hidden transition-all hover:bg-gray-100 focus:bg-gray-100"
                  >
                    <Avatar
                      size={8}
                      initialColor={link.color}
                      classNames={{ display: "rounded-lg" }}
                    >
                      <link.Icon className="size-4.5" />
                    </Avatar>
                    <div>
                      <h2 className="group-hover:text-primary-600 group-focus:text-primary-600 dark:text-dark-100 dark:group-hover:text-primary-400 dark:group-focus:text-primary-400 font-medium text-gray-800 transition-colors">
                        {link.title}
                      </h2>
                      <div className="dark:text-dark-300 truncate text-xs text-gray-400">
                        {link.description}
                      </div>
                    </div>
                  </Link>
                ))}
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
