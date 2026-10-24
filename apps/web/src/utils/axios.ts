import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL } from "@/configs/auth";
import {
  clearTokens,
  getAccessToken,
  getActiveCompanyId,
  getRefreshToken,
  setTokens,
} from "@/utils/jwt";

const axiosInstance = axios.create({ baseURL: API_BASE_URL });

// İstek: access token + aktif şirket header'ı
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const companyId = getActiveCompanyId();
    if (companyId) config.headers["X-Company-Id"] = companyId;
    return config;
  },
);

// Yanıt: 401 → refresh token ile bir kez yenile, isteği tekrarla
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
    }>(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const isAuthRoute = original?.url?.includes("/auth/");

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization =
          `Bearer ${newToken}`;
        return axiosInstance(original);
      }
      // Yenileme başarısız → oturumu kapat
      clearTokens();
      window.dispatchEvent(new Event("fo:session-expired"));
    }
    return Promise.reject(error.response?.data ?? error);
  },
);

export default axiosInstance;
