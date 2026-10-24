import { NavigationTree } from "@/@types/navigation";
import { navigation } from "./index";

/**
 * Segment kökleri (ikon rayı için). MainPanel bu listeyi kullanır.
 */
export const baseNavigation: NavigationTree[] = navigation.map((root) => ({
  id: root.id,
  type: "item",
  path: root.path,
  title: root.title,
  transKey: root.transKey,
  icon: root.icon,
}));

export const baseNavigationObj: Record<string, NavigationTree> =
  Object.fromEntries(baseNavigation.map((n) => [n.id, n]));
