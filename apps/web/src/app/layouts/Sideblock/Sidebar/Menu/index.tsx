// Import Dependencies
import { useLocation } from "react-router";
import { useLayoutEffect, useRef, useState } from "react";
import SimpleBar from "simplebar-react";

// Local Imports
import { useDidUpdate } from "@/hooks";
import { navigation } from "@/app/navigation";
import { Accordion } from "@/components/ui";
import { isRouteActive } from "@/utils/isRouteActive";
import { Group } from "./Group";
import { MenuItem } from "./Group/MenuItem";

// ----------------------------------------------------------------------

export function Menu() {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement | null>(null);

  const activeGroup = navigation.find((item) => {
    if (item.path && isRouteActive(item.path, pathname)) return true;
    return item.childs?.some((c) => {
      if (c.path && isRouteActive(c.path, pathname)) return true;
      return c.childs?.some((sub) => sub.path && isRouteActive(sub.path, pathname));
    });
  });

  const activeCollapsible = activeGroup?.childs?.find((item) => {
    if (item.type === "collapse" && item.childs?.some((c) => isRouteActive(c.path, pathname))) {
      return true;
    }
    if (item.path) return isRouteActive(item.path, pathname);
    return false;
  });

  const [expanded, setExpanded] = useState<string | null>(
    activeCollapsible?.path || null,
  );

  useDidUpdate(() => {
    if (activeCollapsible?.path !== expanded)
      setExpanded(activeCollapsible?.path || null);
  }, [activeCollapsible?.path]);

  useLayoutEffect(() => {
    const activeItem = ref.current?.querySelector("[data-menu-active=true]");
    activeItem?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <SimpleBar
      scrollableNodeProps={{ ref }}
      className="h-full overflow-x-hidden pb-6"
    >
      <Accordion value={expanded} onChange={setExpanded} className="space-y-1">
        {navigation.map((nav, idx) => {
          if (nav.type === "item") {
            const prev = navigation[idx - 1];
            const isFirstItemInBlock = !prev || prev.type !== "item";
            return (
              <div key={nav.id} className={isFirstItemInBlock ? "pt-3" : "pt-1"}>
                <MenuItem data={nav} />
              </div>
            );
          }
          return <Group key={nav.id} data={nav} />;
        })}
      </Accordion>
    </SimpleBar>
  );
}
