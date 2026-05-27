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
  ruangan?: string;
  no_rawat?: string;
};

export type PasienDetail = {
  identitas: {
    no_rkm_medis: string;
    nama: string;
    no_ktp: string;
    jenis_kelamin: string;
    tmp_lahir: string;
    tgl_lahir: string;
    umur_tahun: number;
    gol_darah: string;
    agama: string;
    stts_nikah: string;
    pekerjaan: string;
    umur_label: string;
  };
  kontak: {
    alamat: string;
    no_telepon: string;
    email: string;
  };
  penjamin: {
    kd_pj: string;
    penjamin: string;
    no_peserta: string;
    perusahaan: string;
  };
  keluarga: {
    hubungan: string;
    nama: string;
    pekerjaan: string;
    alamat: string;
    kelurahan: string;
    kecamatan: string;
    kabupaten: string;
    propinsi: string;
  };
  lainnya: {
    pendidikan: string;
    nm_ibu: string;
    tgl_daftar: string;
  };
  perawatan: {
    ruangan_aktif: string;
    no_rawat_aktif: string;
    status_rawat: string;
  };
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

/** Filter penjamin daftar pasien — sama dengan query `penjamin` di backend. */
export type PenjaminFilter = "" | "bpjs" | "umum";

export type PasienFilterParams = {
  cari?: string;
  no_rkm_medis?: string;
  jenis_kelamin?: string;
  status_lanjut?: string;
  penjamin?: PenjaminFilter;
  limit?: number;
  offset?: number;
};

export const PENJAMIN_FILTER_OPTIONS: {
  value: PenjaminFilter;
  label: string;
}[] = [
  { value: "", label: "Semua penjamin" },
  { value: "bpjs", label: "BPJS" },
  { value: "umum", label: "Umum" },
];

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
