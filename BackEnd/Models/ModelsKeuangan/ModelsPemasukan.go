package ModelsKeuangan

import "time"

const (
	PeriodeHariIni    = "hari_ini"
	PeriodeMingguIni  = "minggu_ini"
	PeriodeBulanIni   = "bulan_ini"
	PeriodeTahunIni   = "tahun_ini"
	PeriodeSemuaWaktu = "semua"
)

const (
	JenisRawatJalan = "ralan"
	JenisRawatInap  = "ranap"
)

const (
	GrafikGranularityDay   = "day"
	GrafikGranularityWeek  = "week"
	GrafikGranularityMonth = "month"
	GrafikGranularityAll   = "all"
)

type PendapatanAkunRow struct {
	Tanggal      time.Time `json:"tanggal"`
	NoRawat      string    `json:"no_rawat"`
	NoNota       string    `json:"no_nota"`
	NmPasien     string    `json:"nm_pasien"`
	CaraBayar    string    `json:"cara_bayar"`
	AkunRekening string    `json:"akun_rekening"`
	Total        float64   `json:"total"`
	JenisRawat   string    `json:"jenis_rawat"`
	Rincian      []RincianBayar `json:"rincian,omitempty"`
}

type RincianBayar struct {
	Kategori string  `json:"kategori"`
	Total    float64 `json:"total"`
}

type StrukItem struct {
	NoIndex    int     `json:"noindex"`
	Tanggal    string  `json:"tanggal"`
	Nama       string  `json:"nama"`
	Jumlah     float64 `json:"jumlah"`
	Biaya      float64 `json:"biaya"`
	TotalBiaya float64 `json:"total_biaya"`
	Status     string  `json:"status"`
}

type StrukResponse struct {
	NoRawat      string        `json:"no_rawat"`
	NamaPasien   string        `json:"nama_pasien"`
	NoRkmMedis   string        `json:"no_rkm_medis"`
	CaraBayar    string        `json:"cara_bayar"`
	Tanggal      string        `json:"tanggal"`
	Items        []StrukItem   `json:"items"`
	Subtotal     []RincianBayar `json:"subtotal"`
	GrandTotal   float64       `json:"grand_total"`
}

type PendapatanAkunFilter struct {
	Periode       string
	Cari          string
	JenisRawat    string
	AkunRekening  string
	TanggalDari   string
	TanggalSampai string
	Limit         int
	Offset        int
}

type PendapatanAkunResponse struct {
	Data       []PendapatanAkunRow `json:"data"`
	Total      int                 `json:"total"`
	Limit      int                 `json:"limit"`
	Offset     int                 `json:"offset"`
	GrandTotal float64             `json:"grand_total"`
	PerAkun    []TotalPerAkun      `json:"per_akun,omitempty"`
}

type TotalPerAkun struct {
	AkunRekening string  `json:"akun_rekening"`
	Total        float64 `json:"total"`
}

type RingkasanPemasukan struct {
	Harian   float64 `json:"harian"`
	Mingguan float64 `json:"mingguan"`
	Bulanan  float64 `json:"bulanan"`
}

type RingkasanPendapatanLaborat struct {
	Harian   float64 `json:"harian"`
	Mingguan float64 `json:"mingguan"`
	Bulanan  float64 `json:"bulanan"`
	Tahunan  float64 `json:"tahunan"`
	Semua    float64 `json:"semua"`
}

type GrafikTitik struct {
	Label string  `json:"label"`
	Nilai float64 `json:"nilai"`
}

type KeuanganTotalTitik struct {
	Label       string  `json:"label"`
	Pemasukan   float64 `json:"pemasukan"`
	Pengeluaran float64 `json:"pengeluaran"`
}

type PemasukanKategoriItem struct {
	Kategori string  `json:"kategori"`
	Jumlah   float64 `json:"jumlah"`
	Persen   float64 `json:"persen"`
}

type HistoriItem struct {
	ID       string  `json:"id"`
	Judul    string  `json:"judul"`
	Tanggal  string  `json:"tanggal"`
	Jenis    string  `json:"jenis"`
	Nominal  float64 `json:"nominal"`
	Kategori string  `json:"kategori,omitempty"`
}

type HistoriResponse struct {
	Data   []HistoriItem `json:"data"`
	Total  int           `json:"total"`
	Limit  int           `json:"limit"`
	Offset int           `json:"offset"`
}

type HistoriPengeluaranRow struct {
	NoKeluar  string  `json:"no_keluar"`
	Tanggal   string  `json:"tanggal"`
	Kategori  string  `json:"kategori"`
	Keterangan string `json:"keterangan"`
	Biaya     float64 `json:"biaya"`
}

type HistoriPengeluaranFilter struct {
	Periode  string
	Cari     string
	Kategori string
	Limit    int
	Offset   int
}

type HistoriPengeluaranResponse struct {
	Data   []HistoriPengeluaranRow `json:"data"`
	Total  int                   `json:"total"`
	Limit  int                   `json:"limit"`
	Offset int                   `json:"offset"`
}

type KategoriPengeluaranItem struct {
	Kode string `json:"kode"`
	Nama string `json:"nama"`
}
