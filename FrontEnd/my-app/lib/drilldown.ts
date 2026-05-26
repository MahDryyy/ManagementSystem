import type { KategoriUmurPeriode } from "@/lib/types/dashboard-pasien";

export type DrilldownTipe =
  | "ringkasan_total"
  | "ringkasan_ralan"
  | "ringkasan_ranap"
  | "kategori_umur"
  | "status_jalan_aktif"
  | "status_inap_aktif"
  | "diagnosa";

export type DrilldownModalConfig = {
  title: string;
  subtitle: string;
  tipe: DrilldownTipe;
  periode?: KategoriUmurPeriode | string;
  kategori?: string;
  kd_penyakit?: string;
};

export function periodeLabel(periode?: string) {
  switch (periode) {
    case "hari_ini":
      return "Harian";
    case "minggu_ini":
      return "Mingguan";
    case "bulan_ini":
      return "Bulanan";
    case "semua":
      return "Semua waktu";
    case "tahun_ini":
      return "Tahunan";
    default:
      return periode ?? "";
  }
}
