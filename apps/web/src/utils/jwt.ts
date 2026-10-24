import { jwtDecode } from "jwt-decode";
import { STORAGE_KEYS } from "@/configs/auth";

export const isTokenValid = (token?: string | null): boolean => {
  if (!token) return false;
  try {
    const decoded: { exp?: number } = jwtDecode(token);
    if (!decoded.exp) return false;
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};

// --- Token deposu ---

export const getAccessToken = () =>
  localStorage.getItem(STORAGE_KEYS.accessToken);
export const getRefreshToken = () =>
  localStorage.getItem(STORAGE_KEYS.refreshToken);

export const setTokens = (accessToken?: string, refreshToken?: string) => {
  if (accessToken) localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  if (refreshToken)
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
};

// --- Aktif şirket ---

export const getActiveCompanyId = () =>
  localStorage.getItem(STORAGE_KEYS.activeCompanyId);

export const setActiveCompanyId = (companyId?: string | null) => {
  if (companyId)
    localStorage.setItem(STORAGE_KEYS.activeCompanyId, companyId);
  else localStorage.removeItem(STORAGE_KEYS.activeCompanyId);
};
