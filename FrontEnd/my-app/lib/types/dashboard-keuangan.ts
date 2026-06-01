export type KeuanganPeriode =
  | "hari_ini"
  | "minggu_ini"
  | "bulan_ini"
  | "tahun_ini"
  | "semua";

export type GrafikGranularity = "day" | "week" | "month";

export type PendapatanAkunRow = {
  tanggal: string;
  no_rawat: string;
  no_nota: string;
  nm_pasien: string;
  cara_bayar: string;
  akun_rekening: string;
  total: number;
  jenis_rawat: "ralan" | "ranap";
};

export type TotalPerAkun = {
  akun_rekening: string;
  total: number;
};

export type PendapatanAkunResponse = {
  data: PendapatanAkunRow[];
  total: number;
  limit: number;
  offset: number;
  grand_total: number;
  per_akun?: TotalPerAkun[];
};

export type RingkasanPemasukan = {
  harian: number;
  mingguan: number;
  bulanan: number;
};

export type RingkasanPendapatanLaborat = {
  harian: number;
  mingguan: number;
  bulanan: number;
  tahunan: number;
  semua: number;
};

export type GrafikTitik = {
  label: string;
  nilai: number;
};

export type KeuanganTotalTitik = {
  label: string;
  pemasukan: number;
  pengeluaran: number;
};

export type PemasukanKategoriItem = {
  kategori: string;
  jumlah: number;
  persen: number;
};

export type HistoriItem = {
  id: string;
  judul: string;
  tanggal: string;
  jenis: "pemasukan" | "pengeluaran";
  nominal: number;
  kategori?: string;
};

export type HistoriResponse = {
  data: HistoriItem[];
  total: number;
  limit: number;
  offset: number;
};

export const KEUANGAN_PERIODE_OPTIONS: { value: KeuanganPeriode; label: string }[] =
  [
    { value: "hari_ini", label: "Hari ini" },
    { value: "minggu_ini", label: "Minggu ini" },
    { value: "bulan_ini", label: "Bulan ini" },
    { value: "tahun_ini", label: "Tahun ini" },
    { value: "semua", label: "Semua" },
  ];

export const GRAFIK_GRANULARITY_OPTIONS: {
  value: GrafikGranularity;
  label: string;
}[] = [
  { value: "day", label: "day" },
  { value: "week", label: "week" },
  { value: "month", label: "month" },
];
