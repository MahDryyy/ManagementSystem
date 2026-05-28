import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/http";
import type { RoleItem, UserItem } from "@/lib/types/auth";

export function fetchRoles() {
  return apiGet<RoleItem[]>("/api/admin/roles");
}

export function createRole(data: { name: string; dashboard_keys: string[] }) {
  return apiPost<RoleItem>("/api/admin/roles", data);
}

export function updateRole(
  id: number,
  data: { name: string; dashboard_keys: string[] },
) {
  return apiPut<RoleItem>(`/api/admin/roles/${id}`, data);
}

export function deleteRole(id: number) {
  return apiDelete(`/api/admin/roles/${id}`);
}

export function fetchUsers() {
  return apiGet<UserItem[]>("/api/admin/users");
}

export function createUser(data: {
  username: string;
  password: string;
  role_id: number;
}) {
  return apiPost<UserItem>("/api/admin/users", data);
}

export function updateUser(
  id: number,
  data: { password?: string; role_id?: number; is_active?: boolean },
) {
  return apiPut<UserItem>(`/api/admin/users/${id}`, data);
}

export function deleteUser(id: number) {
  return apiDelete(`/api/admin/users/${id}`);
}
