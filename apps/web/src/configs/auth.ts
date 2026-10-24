/**
 * FilomOnline backend (NestJS).
 * Global prefix: /api/v1 — bkz. apps/api/src/main.ts
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1";

// localStorage anahtarları
export const STORAGE_KEYS = {
  accessToken: "fo.accessToken",
  refreshToken: "fo.refreshToken",
  activeCompanyId: "fo.activeCompanyId",
} as const;
