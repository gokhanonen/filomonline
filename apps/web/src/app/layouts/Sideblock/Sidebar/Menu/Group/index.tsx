// Import Dependencies
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import invariant from "tiny-invariant";

// Local Imports
import { Collapse } from "@/components/ui";
import { useDisclosure } from "@/hooks";
import { useThemeContext } from "@/app/contexts/theme/context";
import { useBreakpointsContext } from "@/app/contexts/breakpoint/context";
import { useSidebarContext } from "@/app/contexts/sidebar/context";
import { CollapsibleItem } from "./CollapsibleItem";
import { MenuItem } from "./MenuItem";
import { type NavigationTree } from "@/@types/navigation";

// ----------------------------------------------------------------------

export function Group({ data }: { data: NavigationTree }) {
  const [isOpened, { toggle }] = useDisclosure(true);
  const { t } = useTranslation();
  const { cardSkin } = useThemeContext();
  const { pathname } = useLocation();
  const { lgAndDown } = useBreakpointsContext();
  const { close } = useSidebarContext();

  invariant(
    data.childs && data.childs.length > 0,
    "[Group] Group menu must have at least one child",
  );

  const hasChildWithSamePath = data.childs?.some((c) => c.path === data.path);
  const isLinkHeader = Boolean(data.path && !hasChildWithSamePath);
  const isExactActive = Boolean(isLinkHeader && pathname === data.path);

  return (
    <div className="pt-3">
      <div
        className={clsx(
          "sticky top-0 z-10 bg-white px-6",
          cardSkin === "bordered" ? "dark:bg-dark-900" : "dark:bg-dark-750",
        )}
      >
        <div className="mb-2 flex items-center justify-between pt-2">
          {isLinkHeader && data.path ? (
            <NavLink
              to={data.path}
              data-menu-active={isExactActive}
              onClick={() => {
                if (!isOpened) toggle();
                if (lgAndDown) close();
              }}
              className={clsx(
                "flex items-center gap-2 text-xs tracking-wider uppercase outline-hidden transition-colors cursor-pointer",
                isExactActive
                  ? "text-primary-600 dark:text-primary-400 font-bold"
                  : "text-gray-500 hover:text-gray-900 dark:text-dark-300 dark:hover:text-dark-50 font-medium",
              )}
            >
              <span>{data.transKey ? t(data.transKey) : data.title}</span>
            </NavLink>
          ) : (
            <button
              onClick={toggle}
              className="dark:text-dark-300 dark:hover:text-dark-50 dark:focus:text-dark-50 flex cursor-pointer items-center gap-3 text-xs font-medium tracking-wider text-gray-500 uppercase outline-hidden hover:text-gray-900 focus:text-gray-900"
            >
              <span>{data.transKey ? t(data.transKey) : data.title}</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggle}
            className="flex size-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-200 cursor-pointer transition-colors"
            title={isOpened ? "Daralt" : "Genişlet"}
            aria-label={isOpened ? "Daralt" : "Genişlet"}
          >
            <ChevronDownIcon
              className={clsx(
                "size-3.5 transition-transform duration-200",
                !isOpened && "-rotate-90",
              )}
            />
          </button>
        </div>
        <div
          className={clsx(
            "pointer-events-none absolute inset-x-0 -bottom-3 h-3 bg-linear-to-b from-white to-transparent",
            cardSkin === "bordered"
              ? "dark:from-dark-900"
              : "dark:from-dark-750",
          )}
        ></div>
      </div>
      {data.childs && data.childs.length > 0 && (
        <Collapse in={isOpened}>
          <div className="flex flex-col space-y-1.5">
            {data.childs.map((item) => {
              switch (item.type) {
                case "collapse":
                  return <CollapsibleItem key={item.path} data={item} />;
                case "item":
                  return <MenuItem key={item.path} data={item} />;
                default:
                  return null;
              }
            })}
          </div>
        </Collapse>
      )}
    </div>
  );
}
