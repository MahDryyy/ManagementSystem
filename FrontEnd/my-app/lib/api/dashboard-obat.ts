import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth/storage";
import type { DashboardObatResponse } from "@/lib/types/dashboard-obat";

export async function fetchDashboardObat() {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/dashboard/obat`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    const { clearToken } = await import("@/lib/auth/storage");
    clearToken();
    throw new Error("Sesi berakhir, silakan login lagi");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request gagal (${res.status})`);
  }
  const json = await res.json();
  return json.data as DashboardObatResponse;
}
