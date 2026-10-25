import { Navigate, RouteObject } from "react-router";

import AuthGuard from "@/middleware/AuthGuard";
import { DynamicLayout } from "../layouts/DynamicLayout";

/**
 * Oturum gerektiren route'lar. Modül sayfaları yazıldıkça Placeholder'lar
 * lazy-loaded gerçek sayfalarla değiştirilecek.
 */
const protectedRoutes: RouteObject = {
  id: "protected",
  Component: AuthGuard,
  children: [
    {
      Component: DynamicLayout,
      children: [
        { index: true, element: <Navigate to="/dashboard" /> },

        // --- Operasyon ---
        {
          path: "dashboard",
          lazy: async () => ({
            Component: (await import("@/app/pages/dashboard")).default,
          }),
        },
        {
          path: "vehicles",
          lazy: async () => ({
            Component: (await import("@/app/pages/vehicles")).default,
          }),
        },
        {
          path: "vehicles/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vehicles/VehicleDetail")).default,
          }),
        },
        {
          path: "accounts",
          lazy: async () => ({
            Component: (await import("@/app/pages/accounts")).default,
          }),
        },
        {
          path: "products",
          lazy: async () => ({
            Component: (await import("@/app/pages/products")).default,
          }),
        },
        {
          path: "locations",
          lazy: async () => ({
            Component: (await import("@/app/pages/locations")).default,
          }),
        },
        {
          path: "activity",
          lazy: async () => ({
            Component: (await import("@/app/pages/activity")).default,
          }),
        },
        {
          path: "chat",
          lazy: async () => ({
            Component: (await import("@/app/pages/chat")).default,
          }),
        },

        // --- CRM & Satış ---
        {
          path: "crm",
          element: <Navigate to="/crm/leads" />,
        },
        {
          path: "crm/leads",
          lazy: async () => ({
            Component: (await import("@/app/pages/crm")).default,
          }),
        },
        {
          path: "crm/test-drives",
          lazy: async () => ({
            Component: (await import("@/app/pages/crm/TestDrivesPage")).default,
          }),
        },
        {
          path: "crm/quotes",
          lazy: async () => ({
            Component: (await import("@/app/pages/crm/QuotesPage")).default,
          }),
        },

        // --- Finans ---
        {
          path: "invoices",
          lazy: async () => ({
            Component: (await import("@/app/pages/invoices")).default,
          }),
        },
        {
          path: "expenses",
          lazy: async () => ({
            Component: (await import("@/app/pages/expenses")).default,
          }),
        },
        {
          path: "contracts",
          lazy: async () => ({
            Component: (await import("@/app/pages/contracts")).default,
          }),
        },
        {
          path: "rentals",
          lazy: async () => ({
            Component: (await import("@/app/pages/contracts")).default,
          }),
        },
        // --- Finans ---
        { path: "finance", element: <Navigate to="/finance/accounts" replace /> },
        { path: "cash-bank", element: <Navigate to="/finance/accounts" replace /> },
        { path: "finance/cash-bank", element: <Navigate to="/finance/accounts" replace /> },
        {
          path: "finance/accounts",
          lazy: async () => ({
            Component: (await import("@/app/pages/finance/accounts")).default,
          }),
        },
        {
          path: "finance/movements",
          lazy: async () => ({
            Component: (await import("@/app/pages/finance/movements")).default,
          }),
        },
        {
          path: "finance/cheques",
          lazy: async () => ({
            Component: (await import("@/app/pages/finance/cheques")).default,
          }),
        },
        {
          path: "finance/receivables",
          lazy: async () => ({
            Component: (await import("@/app/pages/finance/receivables")).default,
          }),
        },
        {
          path: "finance/statement/:accountId?",
          lazy: async () => ({
            Component: (await import("@/app/pages/finance/statement")).default,
          }),
        },
        {
          path: "reports",
          lazy: async () => ({
            Component: (await import("@/app/pages/reports")).default,
          }),
        },

        // --- Yönetim ---
        {
          path: "users",
          lazy: async () => ({
            Component: (await import("@/app/pages/users")).default,
          }),
        },
        {
          path: "catalog",
          lazy: async () => ({
            Component: (await import("@/app/pages/catalog")).default,
          }),
        },
        {
          path: "company",
          lazy: async () => ({
            Component: (await import("@/app/pages/company")).default,
          }),
        },
        {
          path: "definitions",
          element: <Navigate to="/catalog" replace />,
        },
        // Süper-admin konsolu (sayfa kendi içinde yetki kontrolü yapar)
        {
          path: "admin",
          lazy: async () => ({
            Component: (await import("@/app/pages/admin")).default,
          }),
        },
        // Not: Holding/firma yönetimi süper-admin'e özel ayrı konsolda olacak (/admin/*),
        // normal sol menüde değil. Firma değiştirme sağ üstteki combobox ile yapılır.

        // --- Ayarlar (temadan korundu) ---
        {
          path: "settings",
          lazy: async () => ({
            Component: (await import("@/app/pages/settings/Layout")).default,
          }),
          children: [
            { index: true, element: <Navigate to="/settings/general" /> },
            {
              path: "general",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/General")).default,
              }),
            },
            {
              path: "appearance",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/Appearance")).default,
              }),
            },
            {
              path: "notifications",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/Notifications")).default,
              }),
            },
            {
              path: "applications",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/Applications")).default,
              }),
            },
            {
              path: "sessions",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/Sessions")).default,
              }),
            },
            {
              path: "billing",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/Billing")).default,
              }),
            },
          ],
        },
      ],
    },
  ],
};

export { protectedRoutes };
