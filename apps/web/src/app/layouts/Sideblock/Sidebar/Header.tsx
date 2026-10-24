// Import Dependencies
import { Link } from "react-router";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

// Local Imports
import Logo from "@/assets/appLogo.svg?react";
import { Button } from "@/components/ui";
import { useSidebarContext } from "@/app/contexts/sidebar/context";

// ----------------------------------------------------------------------

export function Header() {
  const { close } = useSidebarContext();
  return (
    <header className="relative flex h-[61px] shrink-0 items-center justify-between ltr:pl-6 ltr:pr-3 rtl:pl-3 rtl:pr-6">
      <Link to="/" className="flex items-center justify-start gap-2.5 pt-3 group">
        <Logo className="size-8 rounded-lg shadow-xs transition-transform group-hover:scale-105 shrink-0" />
        <span className="text-base font-bold tracking-tight text-gray-900 dark:text-dark-50">
          Filom<span className="text-primary-500">online</span>
        </span>
      </Link>
      <div className="pt-5 xl:hidden">
        <Button
          onClick={close}
          variant="flat"
          isIcon
          className="size-6 rounded-full"
        >
          <ChevronLeftIcon className="size-5 rtl:rotate-180" />
        </Button>
      </div>
    </header>
  );
}
