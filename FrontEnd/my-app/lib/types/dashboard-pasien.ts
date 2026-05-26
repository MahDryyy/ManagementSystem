export type DashboardRingkasan = {
  total_pasien_terdaftar: number;
  pasien_rawat_jalan: number;
  pasien_rawat_inap: number;
};

export type KategoriUmurItem = {
  kategori: string;
  jumlah: number;
};

export type StatusPerawatan = {
  total_aktif: number;
  rawat_inap_aktif: number;
  rawat_jalan_aktif: number;
};

export type PasienBaris = {
  id: string;
  nama: string;
  no_telepon: string;
  diagnosa: string;
  tgl_lahir: string;
  umur: number;
  jenis_kelamin: string;
  rawat: string;
  penjamin: string;
  no_rawat?: string;
};

export type DashboardPasienResponse = {
  ringkasan: DashboardRingkasan;
  kategori_umur: KategoriUmurItem[];
  status_perawatan: StatusPerawatan;
  daftar_pasien: PasienBaris[];
};

export type DaftarPasienResponse = {
  data: PasienBaris[];
  total: number;
};

export type DiagnosaTerbanyakItem = {
  kd_penyakit: string;
  nama_penyakit: string;
  jumlah: number;
  persentase: number;
};

export type DiagnosaTerbanyakResponse = {
  periode: string;
  total: number;
  data: DiagnosaTerbanyakItem[];
};

export type PasienFilterParams = {
  cari?: string;
  no_rkm_medis?: string;
  jenis_kelamin?: string;
  status_lanjut?: string;
  limit?: number;
  offset?: number;
};

/** Nilai `periode` query — sama dengan konstanta di BackEnd/Models/ModelsDiagnosa.go */
export type DiagnosaPeriode =
  | "hari_ini"
  | "minggu_ini"
  | "bulan_ini"
  | "tahun_ini"
  | "semua";

export const DIAGNOSA_PERIODE_OPTIONS: {
  value: DiagnosaPeriode;
  label: string;
}[] = [
  { value: "hari_ini", label: "Harian" },
  { value: "bulan_ini", label: "Bulanan" },
  { value: "semua", label: "Semua waktu" },
];

export type KategoriUmurPeriode =
  | "hari_ini"
  | "minggu_ini"
  | "bulan_ini"
  | "semua";

export const KATEGORI_UMUR_PERIODE_OPTIONS: {
  value: KategoriUmurPeriode;
  label: string;
}[] = [
  { value: "hari_ini", label: "Harian" },
  { value: "minggu_ini", label: "Mingguan" },
  { value: "bulan_ini", label: "Bulanan" },
  { value: "semua", label: "Semua waktu" },
];
