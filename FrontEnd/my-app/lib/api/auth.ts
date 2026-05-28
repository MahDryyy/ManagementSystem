import { apiGet, apiPostPublic } from "@/lib/api/http";
import type { AuthUser, DashboardKeyItem, LoginResponse } from "@/lib/types/auth";

export function login(username: string, password: string) {
  return apiPostPublic<LoginResponse>("/api/auth/login", { username, password });
}

export function fetchMe() {
  return apiGet<AuthUser>("/api/auth/me");
}

export function fetchDashboardKeys() {
  return apiGet<DashboardKeyItem[]>("/api/auth/dashboard-keys");
}
