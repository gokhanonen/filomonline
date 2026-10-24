import { RouteObject } from "react-router";

/**
 * Herkese açık route'lar (oturum gerektirmez).
 * Hata sayfaları Root ErrorBoundary üzerinden karşılanır; demo prototip
 * sayfaları kaldırıldı.
 */
const publicRoutes: RouteObject = {
  id: "public",
  children: [],
};

export { publicRoutes };
