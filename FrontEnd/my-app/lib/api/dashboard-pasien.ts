import { API_BASE_URL } from "@/lib/config";
import type { DrilldownTipe } from "@/lib/drilldown";
import type {
  DaftarPasienResponse,
  DashboardPasienResponse,
  DiagnosaPeriode,
  DiagnosaTerbanyakResponse,
  KategoriUmurItem,
  KategoriUmurPeriode,
  PasienDetail,
  PasienFilterParams,
} from "@/lib/types/dashboard-pasien";

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      q.set(key, String(value));
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request gagal (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

export function fetchDashboardPasien(params?: PasienFilterParams) {
  return apiGet<DashboardPasienResponse>(
    `/api/dashboard/pasien${buildQuery({
      cari: params?.cari,
      no_rkm_medis: params?.no_rkm_medis,
      jenis_kelamin: params?.jenis_kelamin,
      status_lanjut: params?.status_lanjut,
      penjamin: params?.penjamin,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    })}`,
  );
}

export function fetchDaftarPasien(params?: PasienFilterParams) {
  return apiGet<DaftarPasienResponse>(
    `/api/dashboard/pasien/daftar${buildQuery({
      cari: params?.cari,
      no_rkm_medis: params?.no_rkm_medis,
      jenis_kelamin: params?.jenis_kelamin,
      status_lanjut: params?.status_lanjut,
      penjamin: params?.penjamin,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    })}`,
  );
}

export function fetchDiagnosaTerbanyak(
  periode: DiagnosaPeriode,
  limit = 10,
) {
  return apiGet<DiagnosaTerbanyakResponse>(
    `/api/dashboard/diagnosa/terbanyak${buildQuery({ periode, limit })}`,
  );
}

export function fetchKategoriUmur(periode: KategoriUmurPeriode) {
  return apiGet<KategoriUmurItem[]>(
    `/api/dashboard/pasien/kategori-umur${buildQuery({ periode })}`,
  );
}

export type DrilldownParams = {
  tipe: DrilldownTipe;
  periode?: string;
  kategori?: string;
  kd_penyakit?: string;
  limit?: number;
  offset?: number;
};

export function fetchPasienDetail(noRkmMedis: string) {
  return apiGet<PasienDetail>(
    `/api/dashboard/pasien/${encodeURIComponent(noRkmMedis)}`,
  );
}

export function fetchDrilldownPasien(params: DrilldownParams) {
  return apiGet<DaftarPasienResponse>(
    `/api/dashboard/pasien/drilldown${buildQuery({
      tipe: params.tipe,
      periode: params.periode,
      kategori: params.kategori,
      kd_penyakit: params.kd_penyakit,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })}`,
  );
}
