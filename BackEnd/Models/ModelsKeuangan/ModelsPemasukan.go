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
