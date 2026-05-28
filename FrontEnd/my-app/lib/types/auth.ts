import type { AppRoute } from "@/lib/routes";

export type AuthUser = {
  id: number;
  username: string;
  role_id: number;
  role_name: string;
  is_superadmin: boolean;
  is_active: boolean;
  dashboard_keys: string[];
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type DashboardKeyItem = {
  key: string;
  label: string;
};

export type RoleItem = {
  id: number;
  name: string;
  is_superadmin: boolean;
  dashboard_keys: string[];
  user_count?: number;
};

export type UserItem = {
  id: number;
  username: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
};

export const DASHBOARD_KEY_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "dashboard-pasien": "Dashboard Pasien",
  "dashboard-obat": "Dashboard Obat",
  "dashboard-website": "Dashboard Website",
  "dashboard-laporan": "Dashboard Laporan",
  "dashboard-keuangan": "Dashboard Keuangan",
  settings: "Settings",
};

export function isAppRoute(key: string): key is AppRoute {
  return key in DASHBOARD_KEY_LABELS;
}
