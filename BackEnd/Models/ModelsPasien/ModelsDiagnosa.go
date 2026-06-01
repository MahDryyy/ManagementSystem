package ModelsPasien


const (
	PeriodeHariIni    = "hari_ini"
	PeriodeMingguIni  = "minggu_ini"
	PeriodeBulanIni   = "bulan_ini"
	PeriodeTahunIni   = "tahun_ini"
	PeriodeSemuaWaktu = "semua"
)


type DiagnosaTerbanyakFilter struct {
	Periode string `json:"periode"`
	Limit   int    `json:"limit"`
	Cari    string `json:"cari"` // kd_penyakit atau nama_penyakit
}


type DiagnosaTerbanyakItem struct {
	KdPenyakit   string  `json:"kd_penyakit"`
	NamaPenyakit string  `json:"nama_penyakit"`
	Jumlah       int     `json:"jumlah"`
	Persentase   float64 `json:"persentase"`
}


type DiagnosaTerbanyakResponse struct {
	Periode string                `json:"periode"`
	Total   int                   `json:"total"`
	Data    []DiagnosaTerbanyakItem `json:"data"`
}
