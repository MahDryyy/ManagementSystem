package ModelsPasien

import "time"

// --- Konstanta Khanza (reg_periksa.status_lanjut, pasien.jk) ---

const (
	StatusLanjutRalan = "Ralan" // Rawat jalan
	StatusLanjutRanap = "Ranap" // Rawat inap

	JenisKelaminLaki      = "L"
	JenisKelaminPerempuan = "P"

	FilterPenjaminBPJS = "bpjs"
	FilterPenjaminUmum = "umum"

	// Kode penjab Khanza (tabel penjab.kd_pj) — sesuaikan jika berbeda per RS.
	KdPjBPJS = "BPJ"
	KdPjUmum = "A09"
)

// Kategori umur untuk chart dashboard (dihitung dari tgl_lahir).
const (
	KategoriUmurBayiBaruLahir = "Bayi Baru Lahir 0–12 bulan"   // 0–12 bulan
	KategoriUmurBalita        = "Balita 1–6 tahun"             // 1–6 tahun
	KategoriUmurPendidikan    = "Usia Pendidikan 7–15 tahun"   // 7–15 tahun
	KategoriUmurProduktif     = "Usia Produktif 16–64 tahun"   // 16–64 tahun
	KategoriUmurLanjut        = "Usia Lanjut 65 tahun ke atas" // 65 tahun ke atas
)

// --- Entitas tabel SIMRS Khanza ---

// Pasien memetakan tabel `pasien`.
type Pasien struct {
	NoRkmMedis string    `json:"no_rkm_medis" db:"no_rkm_medis"`
	NmPasien   string    `json:"nm_pasien" db:"nm_pasien"`
	Jk         string    `json:"jk" db:"jk"`
	TglLahir   time.Time `json:"tgl_lahir" db:"tgl_lahir"`
	NoTlp      string    `json:"no_tlp" db:"no_tlp"`
	Alamat     string    `json:"alamat,omitempty" db:"alamat"`
	TglDaftar  time.Time `json:"tgl_daftar,omitempty" db:"tgl_daftar"`
}

// RegPeriksa memetakan tabel `reg_periksa` (kunjungan/registrasi).
type RegPeriksa struct {
	NoRawat       string    `json:"no_rawat" db:"no_rawat"`
	NoRkmMedis    string    `json:"no_rkm_medis" db:"no_rkm_medis"`
	TglRegistrasi time.Time `json:"tgl_registrasi" db:"tgl_registrasi"`
	JamReg        string    `json:"jam_reg" db:"jam_reg"`
	KdDokter      string    `json:"kd_dokter" db:"kd_dokter"`
	KdPoli        string    `json:"kd_poli" db:"kd_poli"`
	KdPj          string    `json:"kd_pj" db:"kd_pj"`
	StatusLanjut  string    `json:"status_lanjut" db:"status_lanjut"` // Ralan | Ranap
	Stts          string    `json:"stts" db:"stts"`                   // Belum | Sudah | Batal, dll.
}

// Penjab memetakan tabel `penjab` (cara bayar: BPJS, Umum, dll.).
type Penjab struct {
	KdPj     string `json:"kd_pj" db:"kd_pj"`
	PngJawab string `json:"png_jawab" db:"png_jawab"`
}

// DiagnosaPasien memetakan tabel `diagnosa_pasien`.
type DiagnosaPasien struct {
	NoRawat    string `json:"no_rawat" db:"no_rawat"`
	KdPenyakit string `json:"kd_penyakit" db:"kd_penyakit"`
	NmPenyakit string `json:"nm_penyakit" db:"nm_penyakit"` // dari JOIN penyakit
	Status     string `json:"status" db:"status"`           // Ralan | Ranap
}

// --- Response dashboard (agregat dari query) ---

// DashboardRingkasan kartu atas: total pasien, rawat jalan, rawat inap.
type DashboardRingkasan struct {
	TotalPasienTerdaftar int `json:"total_pasien_terdaftar"`
	PasienRawatJalan     int `json:"pasien_rawat_jalan"`
	PasienRawatInap      int `json:"pasien_rawat_inap"`
}

// KategoriUmurItem satu slice pie chart kategori umur.
type KategoriUmurItem struct {
	Kategori string `json:"kategori"`
	Jumlah   int    `json:"jumlah"`
}

// StatusPerawatan kartu status perawatan aktif.
type StatusPerawatan struct {
	TotalAktif      int `json:"total_aktif"`
	RawatInapAktif  int `json:"rawat_inap_aktif"`
	RawatJalanAktif int `json:"rawat_jalan_aktif"`
}

// DashboardPasien gabungan semua data dashboard pasien.
type DashboardPasien struct {
	Ringkasan       DashboardRingkasan `json:"ringkasan"`
	KategoriUmur    []KategoriUmurItem `json:"kategori_umur"`
	StatusPerawatan StatusPerawatan    `json:"status_perawatan"`
	DaftarPasien    []PasienBaris      `json:"daftar_pasien"`
}

// PasienBaris satu baris tabel daftar pasien di dashboard.
type PasienBaris struct {
	ID           string    `json:"id"` // no_rkm_medis (kompatibilitas)
	NoRkmMedis   string    `json:"no_rkm_medis"`
	Nama         string    `json:"nama"`
	NoTelepon    string    `json:"no_telepon"`
	Diagnosa     string    `json:"diagnosa"`
	TglLahir     time.Time `json:"tgl_lahir"`
	Umur         int       `json:"umur"`          // tahun, dihitung saat query
	JenisKelamin string    `json:"jenis_kelamin"` // Laki-laki | Perempuan (label UI)
	Rawat        string    `json:"rawat"`         // Rawat Inap | Rawat Jalan
	Penjamin     string    `json:"penjamin"`      // BPJS, Umum, dll. (png_jawab)
	Ruangan      string     `json:"ruangan,omitempty"` // bangsal · kamar (rawat inap aktif)
	NoRawat      string     `json:"no_rawat,omitempty"`
	TglMasuk     *time.Time `json:"tgl_masuk,omitempty"`  // registrasi / masuk kamar
	TglKeluar    *time.Time `json:"tgl_keluar,omitempty"` // pulang kamar / kunjungan selesai
}

// PasienDetail profil lengkap pasien (drawer / halaman detail).
type PasienDetail struct {
	Identitas PasienDetailIdentitas `json:"identitas"`
	Kontak    PasienDetailKontak    `json:"kontak"`
	Penjamin  PasienDetailPenjamin  `json:"penjamin"`
	Keluarga  PasienDetailKeluarga  `json:"keluarga"`
	Lainnya   PasienDetailLainnya   `json:"lainnya"`
	Perawatan PasienDetailPerawatan `json:"perawatan"`
}

type PasienDetailIdentitas struct {
	NoRkmMedis string    `json:"no_rkm_medis"`
	Nama       string    `json:"nama"`
	NoKTP      string    `json:"no_ktp"`
	JK         string    `json:"jenis_kelamin"`
	TmpLahir   string    `json:"tmp_lahir"`
	TglLahir   time.Time `json:"tgl_lahir"`
	UmurTahun  int       `json:"umur_tahun"`
	GolDarah   string    `json:"gol_darah"`
	Agama      string    `json:"agama"`
	SttsNikah  string    `json:"stts_nikah"`
	Pekerjaan  string    `json:"pekerjaan"`
	UmurLabel  string    `json:"umur_label"`
}

type PasienDetailKontak struct {
	Alamat string `json:"alamat"`
	NoTlp  string `json:"no_telepon"`
	Email  string `json:"email"`
}

type PasienDetailPenjamin struct {
	KdPj       string `json:"kd_pj"`
	Penjamin   string `json:"penjamin"`
	NoPeserta  string `json:"no_peserta"`
	Perusahaan string `json:"perusahaan"`
}

type PasienDetailKeluarga struct {
	Hubungan  string `json:"hubungan"`
	Nama      string `json:"nama"`
	Pekerjaan string `json:"pekerjaan"`
	Alamat    string `json:"alamat"`
	Kelurahan string `json:"kelurahan"`
	Kecamatan string `json:"kecamatan"`
	Kabupaten string `json:"kabupaten"`
	Propinsi  string `json:"propinsi"`
}

type PasienDetailLainnya struct {
	Pendidikan string `json:"pendidikan"`
	NmIbu      string `json:"nm_ibu"`
	TglDaftar  string `json:"tgl_daftar"`
}

type PasienDetailPerawatan struct {
	RuanganAktif string `json:"ruangan_aktif"`
	NoRawatAktif string `json:"no_rawat_aktif"`
	StatusRawat  string `json:"status_rawat"`
}

// PasienFilter parameter pencarian & filter daftar pasien.
type PasienFilter struct {
	Cari         string `json:"cari"` // nama, no_ktp, alamat, atau no_rkm_medis
	NoRkmMedis   string `json:"no_rkm_medis"`
	JenisKelamin string `json:"jenis_kelamin"` // L | P
	StatusLanjut string `json:"status_lanjut"` // Ralan | Ranap | kosong = semua
	Penjamin     string `json:"penjamin"`      // bpjs | umum | kosong = semua
	Limit        int    `json:"limit"`
	Offset       int    `json:"offset"`
}

// DaftarPasienResponse hasil paginasi daftar pasien.
type DaftarPasienResponse struct {
	Data  []PasienBaris `json:"data"`
	Total int           `json:"total"`
}

// Tipe drill-down (klik ringkasan / kategori umur / status perawatan).
const (
	DrilldownRingkasanTotal       = "ringkasan_total"
	DrilldownRingkasanRalan       = "ringkasan_ralan"
	DrilldownRingkasanRanap       = "ringkasan_ranap"
	DrilldownKategoriUmur         = "kategori_umur"
	DrilldownStatusJalanAktif     = "status_jalan_aktif"
	DrilldownStatusInapAktif      = "status_inap_aktif"
	DrilldownDiagnosa             = "diagnosa"
)

// PasienDrilldownFilter parameter daftar pasien saat kartu/chart diklik.
type PasienDrilldownFilter struct {
	Tipe       string `json:"tipe"`
	Periode    string `json:"periode"`     // hari_ini | minggu_ini | bulan_ini | semua
	Kategori   string `json:"kategori"`   // label kategori umur (untuk tipe kategori_umur)
	KdPenyakit string `json:"kd_penyakit"` // kode penyakit (untuk tipe diagnosa)
	Limit      int    `json:"limit"`
	Offset     int    `json:"offset"`
}
