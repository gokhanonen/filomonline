// FilomOnline auth provider — kendi NestJS backend'imize bağlanır.
import { ReactNode, useCallback, useEffect, useMemo, useReducer } from "react";

import axios from "@/utils/axios";
import {
  clearTokens,
  getAccessToken,
  getActiveCompanyId,
  isTokenValid,
  setActiveCompanyId,
  setTokens,
} from "@/utils/jwt";
import { AuthProvider as AuthContext } from "./context";
import type { AuthContextType, LoginCredentials } from "./context";
import { CompanySummary, Membership, User } from "@/@types/user";

interface State {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  errorMessage: string | null;
  user: User | null;
  activeCompanyId: string | null;
}

type Action =
  | { type: "INITIALIZE"; user: User | null; activeCompanyId: string | null }
  | { type: "LOGIN_REQUEST" }
  | { type: "LOGIN_SUCCESS"; user: User; activeCompanyId: string | null }
  | { type: "LOGIN_ERROR"; errorMessage: string }
  | { type: "SWITCH_COMPANY"; activeCompanyId: string }
  | { type: "LOGOUT" };

const initialState: State = {
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  errorMessage: null,
  user: null,
  activeCompanyId: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INITIALIZE":
      return {
        ...state,
        isInitialized: true,
        isAuthenticated: !!action.user,
        user: action.user,
        activeCompanyId: action.activeCompanyId,
      };
    case "LOGIN_REQUEST":
      return { ...state, isLoading: true, errorMessage: null };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.user,
        activeCompanyId: action.activeCompanyId,
      };
    case "LOGIN_ERROR":
      return { ...state, isLoading: false, errorMessage: action.errorMessage };
    case "SWITCH_COMPANY":
      return { ...state, activeCompanyId: action.activeCompanyId };
    case "LOGOUT":
      return { ...initialState, isInitialized: true };
    default:
      return state;
  }
}

/** /auth/me sonucundan varsayılan aktif şirketi seç. */
function resolveActiveCompany(user: User): string | null {
  const stored = getActiveCompanyId();
  const active = user.memberships.filter((m) => m.company.isActive);
  if (stored && active.some((m) => m.company.id === stored)) return stored;
  const def = active.find((m) => m.isDefault) ?? active[0];
  return def?.company.id ?? null;
}

function companiesOf(user: User): CompanySummary[] {
  return user.memberships
    .filter((m) => m.company.isActive)
    .map((m) => m.company);
}

/** Aktif şirketteki izinleri topla. */
function permissionsFor(user: User, companyId: string | null): string[] {
  if (user.isSuperAdmin) return ["*"];
  const membership = user.memberships.find(
    (m) => m.company.id === companyId,
  ) as Membership | undefined;
  if (!membership) return [];
  if (membership.isAdmin) return ["*"];
  return [...new Set(membership.roles.flatMap((r) => r.permissions))];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadMe = useCallback(async () => {
    const { data: user } = await axios.get<User>("/auth/me");
    const activeCompanyId = resolveActiveCompany(user);
    setActiveCompanyId(activeCompanyId);
    return { user, activeCompanyId };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const token = getAccessToken();
        if (!token || !isTokenValid(token)) {
          dispatch({ type: "INITIALIZE", user: null, activeCompanyId: null });
          return;
        }
        const { user, activeCompanyId } = await loadMe();
        dispatch({ type: "INITIALIZE", user, activeCompanyId });
      } catch {
        clearTokens();
        dispatch({ type: "INITIALIZE", user: null, activeCompanyId: null });
      }
    };
    void init();

    const onExpired = () =>
      dispatch({ type: "INITIALIZE", user: null, activeCompanyId: null });
    window.addEventListener("fo:session-expired", onExpired);
    return () => window.removeEventListener("fo:session-expired", onExpired);
  }, [loadMe]);

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      dispatch({ type: "LOGIN_REQUEST" });
      try {
        const { data } = await axios.post<{
          accessToken: string;
          refreshToken: string;
        }>("/auth/login", { email, password });
        setTokens(data.accessToken, data.refreshToken);
        const { user, activeCompanyId } = await loadMe();
        dispatch({ type: "LOGIN_SUCCESS", user, activeCompanyId });
      } catch (err) {
        const message =
          (err as { message?: string })?.message ??
          "E-posta veya şifre hatalı";
        dispatch({ type: "LOGIN_ERROR", errorMessage: message });
      }
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    clearTokens();
    setActiveCompanyId(null);
    dispatch({ type: "LOGOUT" });
  }, []);

  const switchCompany = useCallback(
    (companyId: string) => {
      if (!state.user) return;
      if (!companiesOf(state.user).some((c) => c.id === companyId)) return;
      setActiveCompanyId(companyId);
      dispatch({ type: "SWITCH_COMPANY", activeCompanyId: companyId });
    },
    [state.user],
  );

  const permissions = useMemo(
    () => (state.user ? permissionsFor(state.user, state.activeCompanyId) : []),
    [state.user, state.activeCompanyId],
  );

  const can = useCallback(
    (permission: string) =>
      permissions.includes("*") || permissions.includes(permission),
    [permissions],
  );

  const isCompanyAdmin = useMemo(() => {
    if (!state.user) return false;
    if (state.user.isSuperAdmin) return true;
    const m = state.user.memberships.find((mm) => mm.company.id === state.activeCompanyId);
    return m?.isAdmin ?? false;
  }, [state.user, state.activeCompanyId]);

  const refreshUser = useCallback(async () => {
    try {
      const { user, activeCompanyId } = await loadMe();
      dispatch({ type: "INITIALIZE", user, activeCompanyId });
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  }, [loadMe]);

  const value: AuthContextType = {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    errorMessage: state.errorMessage,
    user: state.user,
    companies: state.user ? companiesOf(state.user) : [],
    activeCompanyId: state.activeCompanyId,
    permissions,
    isSuperAdmin: state.user?.isSuperAdmin ?? false,
    isCompanyAdmin,
    login,
    logout,
    switchCompany,
    refreshUser,
    can,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}
