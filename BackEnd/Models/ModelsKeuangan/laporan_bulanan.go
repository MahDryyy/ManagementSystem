package ModelsKeuangan

// Urutan baris tetap (bukan dari map order) supaya urutan di Excel konsisten
// dengan template "LAPORAN KEUANGAN (BINUS).xlsx".
var LaporanBulananPendapatanRows = []string{
	"PX RAJAL UMUM",
	"LABORAT",
	"PX RAWAT INAP",
	"PX OBSERVASI",
	"PX POLI GIGI",
	"AMBULANS",
	"KAPITASI BPJS",
	"RITP BPJS",
	"RJTP BPJS",
	"PROMOTIF PREVENTIF BPJS",
	"LAIN-LAIN",
	"KANTIN & POP",
	"ESTETIKA",
	"POLING-UMUM",
	"POLING-LAB",
}

var LaporanBulananPengeluaranRows = []string{
	"GAJI KARYAWAN",
	"RUMAH TANGGA (DAPUR)",
	"JASA DOKTER",
	"LISTRIK, AIR, TLP, WIFI, SAMPAH",
	"DANA BERSAMA",
	"OBAT, BHP MEDIS, ALKES, OKSIGEN, ESTETIKA",
	"BHP NON MEDIS (ATK, FK, TISU, SABUN, SAPU, LAMPU, GALON, BENSIN)",
	"SARPRAS (BANGUNAN)",
	"KSO LAB",
	"JASA LAIN-LAIN (PERAWAT, SOPIR, RUJUKAN, KURIR, ADMIN)",
	"KONSUMSI (PROLANIS, TAMU)",
}

var LaporanBulananKasRows = []string{
	"SETOR BANK/TRANSFERAN",
	"BUNGA BANK",
	"AMBIL UANG BANK",
	"ADMIN BANK",
	"SETOR OWNER dari Kas Bank",
	"SETOR MANAGEMEN  dari Kas Bank",
}

var LaporanBulananStatistikRows = []string{
	"JUMLAH PASIEN OB-MRS UMUM",
	"JUMLAH PASIEN OB-MRS BPJS",
	"JUMLAH PASIEN OB-MRS OBSERVASI",
	"JUMLAH PASIEN RAWAT INAP",
	"JUMLAH PASIEN RI - KRS",
	"JUMLAH HARI RAWAT INAP UMUM",
	"JUMLAH HARI RAWAT INAP BPJS",
	"JUMLAH PX BELI OBAT/KHITAN/KB/USG/dll",
	"JUMLAH PX LAB - PKM",
	"JUMLAH PASIEN RJ UMUM",
	"JUMLAH PASIEN RJ BPJS",
	"JUMLAH PASIEN RJ POLI GIGI (BPJS)",
	"JUMLAH PASIEN RJ POLI UMUM (GIGI)",
	"JUMLAH PASIEN POLING-UMUM",
	"JUMLAH PASIEN POLING-BPJS",
	"JUMLAH PASIEN POLING-LAB",
	"JUMLAH LAB DL",
}

// LaporanBulananResponse menampung nilai harian (index 0 = tanggal 1) untuk
// setiap baris laporan. Baris yang tidak punya sumber data di skema
// (misal KAPITASI BPJS, SETOR OWNER) tetap ada sebagai key dengan nilai nol,
// supaya struktur template tetap utuh dan bisa diisi manual oleh user.
type LaporanBulananResponse struct {
	Bulan       int                  `json:"bulan"`
	Tahun       int                  `json:"tahun"`
	JumlahHari  int                  `json:"jumlah_hari"`
	Pendapatan  map[string][]float64 `json:"pendapatan"`
	Pengeluaran map[string][]float64 `json:"pengeluaran"`
	Kas         map[string][]float64 `json:"kas"`
	Statistik   map[string][]float64 `json:"statistik"`
}

// NewLaporanBulananResponse menyiapkan slice kosong (panjang = jumlahHari)
// untuk semua baris yang dikenal, supaya repository tinggal mengisi index
// yang punya data tanpa perlu cek nil map/slice di controller.
func NewLaporanBulananResponse(bulan, tahun, jumlahHari int) LaporanBulananResponse {
	resp := LaporanBulananResponse{
		Bulan:       bulan,
		Tahun:       tahun,
		JumlahHari:  jumlahHari,
		Pendapatan:  make(map[string][]float64, len(LaporanBulananPendapatanRows)),
		Pengeluaran: make(map[string][]float64, len(LaporanBulananPengeluaranRows)),
		Kas:         make(map[string][]float64, len(LaporanBulananKasRows)),
		Statistik:   make(map[string][]float64, len(LaporanBulananStatistikRows)),
	}
	for _, k := range LaporanBulananPendapatanRows {
		resp.Pendapatan[k] = make([]float64, jumlahHari)
	}
	for _, k := range LaporanBulananPengeluaranRows {
		resp.Pengeluaran[k] = make([]float64, jumlahHari)
	}
	for _, k := range LaporanBulananKasRows {
		resp.Kas[k] = make([]float64, jumlahHari)
	}
	for _, k := range LaporanBulananStatistikRows {
		resp.Statistik[k] = make([]float64, jumlahHari)
	}
	return resp
}
