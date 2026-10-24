import { RouteObject } from "react-router";

/**
 * Herkese açık route'lar (oturum gerektirmez).
 * Müşteriye WhatsApp veya SMS ile gönderilen dışlinkler login olmaksızın bu sayfayı açar.
 */
const publicRoutes: RouteObject = {
  id: "public",
  children: [
    {
      path: "v/:token",
      lazy: async () => ({
        Component: (await import("@/app/pages/public/PublicVehiclePage")).default,
      }),
    },
    {
      path: "p/:token",
      lazy: async () => ({
        Component: (await import("@/app/pages/public/PublicVehiclePage")).default,
      }),
    },
  ],
};

export { publicRoutes };

