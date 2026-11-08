// FilomOnline auth provider — kendi NestJS backend'imize bağlanır.
import { ReactNode, useCallback, useEffect, useMemo, useReducer } from "react";

import axios from "@/utils/axios";
import {
  clearTokens,
  getAccessToken,
  getActiveCompanyId,
  getActiveLocationId,
  isTokenValid,
  setActiveCompanyId,
  setActiveLocationId,
  setTokens,
} from "@/utils/jwt";
import { AuthProvider as AuthContext } from "./context";
import type { AuthContextType, LoginCredentials } from "./context";
import {
  CompanySummary,
  LocationSummary,
  Membership,
  User,
} from "@/@types/user";

interface State {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  errorMessage: string | null;
  user: User | null;
  activeCompanyId: string | null;
  activeLocationId: string | null;
}

type Action =
  | {
      type: "INITIALIZE";
      user: User | null;
      activeCompanyId: string | null;
      activeLocationId: string | null;
    }
  | { type: "LOGIN_REQUEST" }
  | {
      type: "LOGIN_SUCCESS";
      user: User;
      activeCompanyId: string | null;
      activeLocationId: string | null;
    }
  | { type: "LOGIN_ERROR"; errorMessage: string }
  | {
      type: "SWITCH_COMPANY";
      activeCompanyId: string;
      activeLocationId: string | null;
    }
  | { type: "SWITCH_LOCATION"; activeCompanyId: string; activeLocationId: string }
  | { type: "LOGOUT" };

const initialState: State = {
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  errorMessage: null,
  user: null,
  activeCompanyId: null,
  activeLocationId: null,
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
        activeLocationId: action.activeLocationId,
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
        activeLocationId: action.activeLocationId,
      };
    case "LOGIN_ERROR":
      return { ...state, isLoading: false, errorMessage: action.errorMessage };
    case "SWITCH_COMPANY":
      return {
        ...state,
        activeCompanyId: action.activeCompanyId,
        activeLocationId: action.activeLocationId,
      };
    case "SWITCH_LOCATION":
      return {
        ...state,
        activeCompanyId: action.activeCompanyId,
        activeLocationId: action.activeLocationId,
      };
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

/** Bir firmanın aktif lokasyonları. */
function locationsOf(user: User, companyId: string | null): LocationSummary[] {
  if (!companyId) return [];
  const company = companiesOf(user).find((c) => c.id === companyId);
  return company?.locations ?? [];
}

/** Aktif firma için varsayılan lokasyonu seç: depolanan geçerliyse o, değilse ilk lokasyon. */
function resolveActiveLocation(
  user: User,
  companyId: string | null,
): string | null {
  const locs = locationsOf(user, companyId);
  if (!locs.length) return null;
  const stored = getActiveLocationId();
  if (stored && locs.some((l) => l.id === stored)) return stored;
  return locs[0]?.id ?? null;
}

/** Aktif şirketteki izinleri topla. */
function permissionsFor(user: User, companyId: string | null): string[] {
  if (user.isSuperAdmin) return ["*"];
  const membership = user.memberships.find(
    (m) => m.company.id === companyId,
  ) as Membership | undefined;
  if (!membership) return [];
  if (membership.isAdmin) return ["*"];
  // Etkin izin = (roller ∪ grant) − deny. Deny kazanır.
  const grant = membership.permissionsGrant ?? [];
  const deny = new Set(membership.permissionsDeny ?? []);
  return [
    ...new Set([...membership.roles.flatMap((r) => r.permissions), ...grant]),
  ].filter((p) => !deny.has(p));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadMe = useCallback(async () => {
    const { data: user } = await axios.get<User>("/auth/me");
    const activeCompanyId = resolveActiveCompany(user);
    setActiveCompanyId(activeCompanyId);
    const activeLocationId = resolveActiveLocation(user, activeCompanyId);
    setActiveLocationId(activeLocationId);
    return { user, activeCompanyId, activeLocationId };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const token = getAccessToken();
        if (!token || !isTokenValid(token)) {
          dispatch({
            type: "INITIALIZE",
            user: null,
            activeCompanyId: null,
            activeLocationId: null,
          });
          return;
        }
        const { user, activeCompanyId, activeLocationId } = await loadMe();
        dispatch({
          type: "INITIALIZE",
          user,
          activeCompanyId,
          activeLocationId,
        });
      } catch {
        clearTokens();
        dispatch({
          type: "INITIALIZE",
          user: null,
          activeCompanyId: null,
          activeLocationId: null,
        });
      }
    };
    void init();

    const onExpired = () =>
      dispatch({
        type: "INITIALIZE",
        user: null,
        activeCompanyId: null,
        activeLocationId: null,
      });
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
        const { user, activeCompanyId, activeLocationId } = await loadMe();
        dispatch({
          type: "LOGIN_SUCCESS",
          user,
          activeCompanyId,
          activeLocationId,
        });
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
    setActiveLocationId(null);
    dispatch({ type: "LOGOUT" });
  }, []);

  const switchCompany = useCallback(
    (companyId: string) => {
      if (!state.user) return;
      if (!companiesOf(state.user).some((c) => c.id === companyId)) return;
      setActiveCompanyId(companyId);
      // Firma değişince o firmanın ilk lokasyonunu aktif yap.
      const locs = locationsOf(state.user, companyId);
      const locationId = locs[0]?.id ?? null;
      setActiveLocationId(locationId);
      dispatch({
        type: "SWITCH_COMPANY",
        activeCompanyId: companyId,
        activeLocationId: locationId,
      });
    },
    [state.user],
  );

  const switchLocation = useCallback(
    (companyId: string, locationId: string) => {
      if (!state.user) return;
      if (!companiesOf(state.user).some((c) => c.id === companyId)) return;
      if (!locationsOf(state.user, companyId).some((l) => l.id === locationId))
        return;
      setActiveCompanyId(companyId);
      setActiveLocationId(locationId);
      dispatch({
        type: "SWITCH_LOCATION",
        activeCompanyId: companyId,
        activeLocationId: locationId,
      });
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

  const activeLocation = useMemo<LocationSummary | null>(() => {
    if (!state.user) return null;
    return (
      locationsOf(state.user, state.activeCompanyId).find(
        (l) => l.id === state.activeLocationId,
      ) ?? null
    );
  }, [state.user, state.activeCompanyId, state.activeLocationId]);

  const isCompanyAdmin = useMemo(() => {
    if (!state.user) return false;
    if (state.user.isSuperAdmin) return true;
    const m = state.user.memberships.find((mm) => mm.company.id === state.activeCompanyId);
    return m?.isAdmin ?? false;
  }, [state.user, state.activeCompanyId]);

  const refreshUser = useCallback(async () => {
    try {
      const { user, activeCompanyId, activeLocationId } = await loadMe();
      dispatch({ type: "INITIALIZE", user, activeCompanyId, activeLocationId });
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
    holdingName: state.user?.tenant?.name ?? null,
    activeCompanyId: state.activeCompanyId,
    activeLocationId: state.activeLocationId,
    activeLocation,
    permissions,
    isSuperAdmin: state.user?.isSuperAdmin ?? false,
    isCompanyAdmin,
    login,
    logout,
    switchCompany,
    switchLocation,
    refreshUser,
    can,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}
