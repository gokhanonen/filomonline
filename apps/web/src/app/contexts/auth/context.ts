import { CompanySummary, User } from "@/@types/user";
import { createSafeContext } from "@/utils/createSafeContext";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  errorMessage: string | null;
  user: User | null;

  /** Kullanıcının erişebildiği şirketler (firma seçici) */
  companies: CompanySummary[];
  /** Aktif şirket id'si (X-Company-Id olarak gönderilir) */
  activeCompanyId: string | null;
  /** Aktif şirkette geçerli izin anahtarları (süper admin/şirket admini → ["*"]) */
  permissions: string[];
  isSuperAdmin: boolean;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: string) => void;
  /** Belirli bir izne sahip mi (["*"] her şeye izin verir) */
  can: (permission: string) => boolean;
}

export const [AuthProvider, useAuthContext] =
  createSafeContext<AuthContextType>(
    "useAuthContext must be used within AuthProvider",
  );
