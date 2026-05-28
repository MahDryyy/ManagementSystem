"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchMe, login as apiLogin } from "@/lib/api/auth";
import { clearToken, getToken, setToken } from "@/lib/auth/storage";
import type { AuthUser } from "@/lib/types/auth";
import { isAppRoute } from "@/lib/types/auth";
import type { AppRoute } from "@/lib/routes";
import { DEFAULT_ROUTE } from "@/lib/routes";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  canAccess: (route: AppRoute) => boolean;
  firstAllowedRoute: () => AppRoute;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const canAccess = useCallback(
    (route: AppRoute) => {
      if (route === "help") return true;
      if (!user) return false;
      if (user.is_superadmin) return true;
      return user.dashboard_keys.includes(route);
    },
    [user],
  );

  const firstAllowedRoute = useCallback((): AppRoute => {
    if (!user) return DEFAULT_ROUTE;
    if (user.is_superadmin) return DEFAULT_ROUTE;
    const preferred: AppRoute[] = [
      "dashboard-pasien",
      "dashboard",
      "dashboard-obat",
      "dashboard-website",
      "dashboard-laporan",
      "dashboard-keuangan",
      "settings",
    ];
    for (const r of preferred) {
      if (user.dashboard_keys.includes(r)) return r;
    }
    const first = user.dashboard_keys.find(isAppRoute);
    return first ?? DEFAULT_ROUTE;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      canAccess,
      firstAllowedRoute,
    }),
    [user, loading, login, logout, canAccess, firstAllowedRoute],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus di dalam AuthProvider");
  return ctx;
}
