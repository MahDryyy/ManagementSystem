import { apiGet, buildQuery } from "@/lib/api/http";
import type {
  GrafikGranularity,
  GrafikTitik,
  HistoriResponse,
  HistoriPengeluaranParams,
  HistoriPengeluaranResponse,
  KategoriPengeluaranItem,
  KeuanganPeriode,
  KeuanganTotalTitik,
  PemasukanKategoriItem,
  PendapatanAkunResponse,
  RingkasanPemasukan,
  RingkasanPendapatanLaborat,
  StrukResponse,
} from "@/lib/types/dashboard-keuangan";

export type PendapatanAkunParams = {
  periode?: KeuanganPeriode;
  cari?: string;
  jenis_rawat?: "ralan" | "ranap" | "";
  akun_rekening?: string;
  tanggal_dari?: string;
  tanggal_sampai?: string;
  limit?: number;
  offset?: number;
};

export function fetchRingkasanKeuangan() {
  return apiGet<RingkasanPemasukan>("/api/dashboard/keuangan/ringkasan");
}

export function fetchGrafikPemasukan(granularity: GrafikGranularity) {
  return apiGet<GrafikTitik[]>(
    `/api/dashboard/keuangan/grafik-pemasukan${buildQuery({ granularity })}`,
  );
}

export function fetchGrafikPengeluaran(granularity: GrafikGranularity) {
  return apiGet<GrafikTitik[]>(
    `/api/dashboard/keuangan/grafik-pengeluaran${buildQuery({ granularity })}`,
  );
}

export function fetchKeuanganTotal(periode: KeuanganPeriode) {
  return apiGet<KeuanganTotalTitik[]>(
    `/api/dashboard/keuangan/keuangan-total${buildQuery({ periode })}`,
  );
}

export function fetchPemasukanKategori(periode: KeuanganPeriode) {
  return apiGet<PemasukanKategoriItem[]>(
    `/api/dashboard/keuangan/pemasukan-kategori${buildQuery({ periode })}`,
  );
}

export function fetchHistoriKeuangan(limit = 10, offset = 0) {
  return apiGet<HistoriResponse>(
    `/api/dashboard/keuangan/histori${buildQuery({ limit, offset })}`,
  );
}

export function fetchHistoriPengeluaran(params?: HistoriPengeluaranParams) {
  return apiGet<HistoriPengeluaranResponse>(
    `/api/dashboard/keuangan/histori-pengeluaran${buildQuery({
      periode: params?.periode,
      cari: params?.cari,
      kategori: params?.kategori,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    })}`,
  );
}

export function fetchKategoriPengeluaran() {
  return apiGet<KategoriPengeluaranItem[]>(
    "/api/dashboard/keuangan/kategori-pengeluaran",
  );
}

export function fetchPendapatanAkun(params?: PendapatanAkunParams) {
  return apiGet<PendapatanAkunResponse>(
    `/api/dashboard/keuangan/pendapatan-akun${buildQuery({
      periode: params?.periode,
      cari: params?.cari,
      jenis_rawat: params?.jenis_rawat,
      akun_rekening: params?.akun_rekening,
      tanggal_dari: params?.tanggal_dari,
      tanggal_sampai: params?.tanggal_sampai,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    })}`,
  );
}

export function fetchStrukKeuangan(noRawat: string) {
  return apiGet<StrukResponse>(
    `/api/dashboard/keuangan/pendapatan-akun/struk${buildQuery({
      no_rawat: noRawat,
    })}`,
  );
}

export function fetchRingkasanPendapatanLaborat() {
  return apiGet<RingkasanPendapatanLaborat>(
    "/api/dashboard/keuangan/ringkasan-pendapatan-laborat",
  );
}

export function fetchGrafikPendapatanLaborat(periode: KeuanganPeriode) {
  return apiGet<GrafikTitik[]>(
    `/api/dashboard/keuangan/grafik-pendapatan-laborat${buildQuery({ periode })}`,
  );
}
