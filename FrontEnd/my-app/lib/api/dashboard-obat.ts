import { apiGet } from "@/lib/api/http";
import type { DashboardObatResponse } from "@/lib/types/dashboard-obat";

export function fetchDashboardObat() {
  return apiGet<DashboardObatResponse>("/api/dashboard/obat");
}
