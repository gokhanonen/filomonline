// Import Dependencies
import { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router";

// Local Imports
import { useBreakpointsContext } from "@/app/contexts/breakpoint/context";
import { useSidebarContext } from "@/app/contexts/sidebar/context";
import { navigation } from "@/app/navigation";
import { useDidUpdate } from "@/hooks";
import { isRouteActive } from "@/utils/isRouteActive";
import { MainPanel } from "./MainPanel";
import { PrimePanel } from "./PrimePanel";

// ----------------------------------------------------------------------

export type SegmentPath = string | undefined;

export function Sidebar() {
  const { pathname } = useLocation();
  const { name, lgAndDown } = useBreakpointsContext();
  const { isExpanded, close } = useSidebarContext();

  const findMatchingSegment = useCallback((path: string) => {
    return navigation.find((item) => {
      if (isRouteActive(item.path, path)) return true;
      return item.childs?.some((c) => {
        if (isRouteActive(c.path, path)) return true;
        return c.childs?.some((sub) => isRouteActive(sub.path, path));
      });
    })?.path;
  }, []);

  const [activeSegmentPath, setActiveSegmentPath] = useState<SegmentPath>(() =>
    findMatchingSegment(pathname),
  );

  const currentSegment = useMemo(() => {
    return navigation.find((item) => item.path === activeSegmentPath);
  }, [activeSegmentPath]);

  useDidUpdate(() => {
    const activePath = findMatchingSegment(pathname);
    setActiveSegmentPath(activePath);
  }, [pathname]);

  useDidUpdate(() => {
    if (lgAndDown && isExpanded) close();
  }, [name]);

  return (
    <>
      <MainPanel
        nav={navigation}
        activeSegmentPath={activeSegmentPath}
        setActiveSegmentPath={setActiveSegmentPath}
      />
      <PrimePanel
        close={close}
        currentSegment={currentSegment}
        pathname={pathname}
      />
    </>
  );
}
