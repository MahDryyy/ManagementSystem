package repositories

import (
	ModelsKeuangan "BackEnd/Models/ModelsKeuangan"
	"fmt"
	"time"
)

func daysInMonth(tahun, bulan int) int {
	return time.Date(tahun, time.Month(bulan+1), 0, 0, 0, 0, 0, time.UTC).Day()
}

// GetLaporanBulanan mengagregasi data harian untuk satu bulan, dikelompokkan
// sesuai baris pada template "LAPORAN KEUANGAN (BINUS).xlsx" (lihat
// ModelsKeuangan.LaporanBulanan*Rows untuk daftar baris yang dikenal).
func (r *keuanganRepository) GetLaporanBulanan(bulan, tahun int) (ModelsKeuangan.LaporanBulananResponse, error) {
	jumlahHari := daysInMonth(tahun, bulan)
	resp := ModelsKeuangan.NewLaporanBulananResponse(bulan, tahun, jumlahHari)

	if err := r.fillPendapatanBilling(&resp, bulan, tahun, jumlahHari); err != nil {
		return resp, err
	}
	if err := r.fillPendapatanLaborat(&resp, bulan, tahun, jumlahHari); err != nil {
		return resp, err
	}
	if err := r.fillPemasukanLain(&resp, bulan, tahun, jumlahHari); err != nil {
		return resp, err
	}
	if err := r.fillPengeluaran(&resp, bulan, tahun, jumlahHari); err != nil {
		return resp, err
	}
	if err := r.fillStatistikPasien(&resp, bulan, tahun, jumlahHari); err != nil {
		return resp, err
	}
	if err := r.fillStatistikRawatInap(&resp, bulan, tahun, jumlahHari); err != nil {
		return resp, err
	}
	if err := r.fillStatistikLab(&resp, bulan, tahun, jumlahHari); err != nil {
		return resp, err
	}

	return resp, nil
}

// addToDay menambahkan nilai ke slice harian, menjaga index tetap dalam batas.
func addToDay(bucket map[string][]float64, kategori string, day int, jumlahHari int, nilai float64) {
	if day < 1 || day > jumlahHari {
		return
	}
	slice, ok := bucket[kategori]
	if !ok {
		return
	}
	slice[day-1] += nilai
}

// fillPendapatanBilling mengisi PX RAJAL UMUM, PX RAWAT INAP, PX POLI GIGI
// dari tabel billing (kolom status), pola query sama dengan yang dipakai
// GetStrukByNoRawat (exclude 'Ttl%' & '-').
func (r *keuanganRepository) fillPendapatanBilling(resp *ModelsKeuangan.LaporanBulananResponse, bulan, tahun, jumlahHari int) error {
	query := `
		SELECT
			DAY(b.tgl_byr) AS d,
			CASE
				WHEN rp.status_lanjut = 'Ranap'
					AND b.status IN ('Kamar','Ranap Dokter','Ranap Dokter Paramedis','Ranap Paramedis')
					THEN 'PX RAWAT INAP'
				WHEN rp.kd_poli = 'U0010'
					AND b.status IN ('Ralan Dokter','Ralan Dokter Paramedis','Ralan Paramedis','Registrasi','Obat')
					THEN 'PX POLI GIGI'
				WHEN rp.status_lanjut = 'Ralan'
					AND b.status IN ('Ralan Dokter','Ralan Dokter Paramedis','Ralan Paramedis','Registrasi','Obat')
					THEN 'PX RAJAL UMUM'
				ELSE NULL
			END AS kategori,
			SUM(b.totalbiaya) AS total
		FROM billing b
		INNER JOIN reg_periksa rp ON b.no_rawat = rp.no_rawat
		WHERE YEAR(b.tgl_byr) = ? AND MONTH(b.tgl_byr) = ?
			AND b.status IS NOT NULL AND b.status <> '-' AND b.status NOT LIKE 'Ttl%'
		GROUP BY d, kategori
		HAVING kategori IS NOT NULL`

	rows, err := r.db.Query(query, tahun, bulan)
	if err != nil {
		return fmt.Errorf("laporan bulanan pendapatan billing: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var day int
		var kategori string
		var total float64
		if err := rows.Scan(&day, &kategori, &total); err != nil {
			return err
		}
		addToDay(resp.Pendapatan, kategori, day, jumlahHari, total)
	}
	return rows.Err()
}

// fillPendapatanLaborat mengisi baris LABORAT, reuse sumber data yang sama
// dengan GetRingkasanPendapatanLaborat (laboratrepo.go): periksa_lab.biaya.
func (r *keuanganRepository) fillPendapatanLaborat(resp *ModelsKeuangan.LaporanBulananResponse, bulan, tahun, jumlahHari int) error {
	query := `
		SELECT DAY(pl.tgl_periksa) AS d, COALESCE(SUM(pl.biaya), 0)
		FROM periksa_lab pl
		WHERE YEAR(pl.tgl_periksa) = ? AND MONTH(pl.tgl_periksa) = ?
		GROUP BY d`

	rows, err := r.db.Query(query, tahun, bulan)
	if err != nil {
		return fmt.Errorf("laporan bulanan laborat: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var day int
		var total float64
		if err := rows.Scan(&day, &total); err != nil {
			return err
		}
		addToDay(resp.Pendapatan, "LABORAT", day, jumlahHari, total)
	}
	return rows.Err()
}

// fillPemasukanLain mengisi AMBULANS & LAIN-LAIN dari pemasukan_lain,
// dipisah lewat nama_kategori yang mengandung "AMBULAN".
func (r *keuanganRepository) fillPemasukanLain(resp *ModelsKeuangan.LaporanBulananResponse, bulan, tahun, jumlahHari int) error {
	query := `
		SELECT
			DAY(pl.tanggal) AS d,
			CASE WHEN COALESCE(k.nama_kategori, '') LIKE '%AMBULAN%' THEN 'AMBULANS' ELSE 'LAIN-LAIN' END AS kategori,
			COALESCE(SUM(pl.besar), 0) AS total
		FROM pemasukan_lain pl
		LEFT JOIN kategori_pemasukan_lain k ON pl.kode_kategori = k.kode_kategori
		WHERE YEAR(pl.tanggal) = ? AND MONTH(pl.tanggal) = ?
		GROUP BY d, kategori`

	rows, err := r.db.Query(query, tahun, bulan)
	if err != nil {
		return fmt.Errorf("laporan bulanan pemasukan lain: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var day int
		var kategori string
		var total float64
		if err := rows.Scan(&day, &kategori, &total); err != nil {
			return err
		}
		addToDay(resp.Pendapatan, kategori, day, jumlahHari, total)
	}
	return rows.Err()
}

// fillPengeluaran mengklasifikasikan pengeluaran_harian ke baris PENGELUARAN
// berdasarkan nama rekening (rekening.nm_rek) & nama kategori. Yang cocok
// "admin/transaksi bank" masuk ke baris ADMIN BANK (bagian KAS), bukan
// PENGELUARAN, karena itu representasi biaya transfer bukan belanja
// operasional. Yang tidak cocok kategori manapun jatuh ke "JASA LAIN-LAIN"
// supaya tidak ada nominal yang hilang dari Total Pengeluaran.
func (r *keuanganRepository) fillPengeluaran(resp *ModelsKeuangan.LaporanBulananResponse, bulan, tahun, jumlahHari int) error {
	query := `
		SELECT
			DAY(ph.tanggal) AS d,
			CASE
				WHEN r.nm_rek LIKE '%ADMIN%' OR r.nm_rek LIKE '%TRANSAKSI%' THEN 'ADMIN BANK'
				WHEN r.nm_rek LIKE '%GAJI%' THEN 'GAJI KARYAWAN'
				WHEN r.nm_rek LIKE '%LISTRIK%' OR r.nm_rek LIKE '%TELEPON%' OR r.nm_rek LIKE '%WIFI%'
					OR r.nm_rek LIKE '%SAMPAH%' OR r.nm_rek LIKE '%AIR%' THEN 'LISTRIK, AIR, TLP, WIFI, SAMPAH'
				WHEN r.nm_rek LIKE '%BANGUNAN%' OR r.nm_rek LIKE '%SARANA%' OR r.nm_rek LIKE '%PRASARANA%'
					THEN 'SARPRAS (BANGUNAN)'
				WHEN r.nm_rek LIKE '%DAPUR%' OR r.nm_rek LIKE '%RUMAH TANGGA%'
					OR COALESCE(k.nama_kategori, '') LIKE '%DAPUR%' OR COALESCE(k.nama_kategori, '') LIKE '%SNACK%'
					THEN 'RUMAH TANGGA (DAPUR)'
				WHEN r.nm_rek LIKE '%OBAT%' OR r.nm_rek LIKE '%BHP%' OR r.nm_rek LIKE '%ALKES%' OR r.nm_rek LIKE '%OKSIGEN%'
					THEN 'OBAT, BHP MEDIS, ALKES, OKSIGEN, ESTETIKA'
				WHEN r.nm_rek LIKE '%ATK%' OR r.nm_rek LIKE '%TISU%' OR r.nm_rek LIKE '%SABUN%'
					OR r.nm_rek LIKE '%GALON%' OR r.nm_rek LIKE '%BENSIN%' OR r.nm_rek LIKE '%SOLAR%'
					THEN 'BHP NON MEDIS (ATK, FK, TISU, SABUN, SAPU, LAMPU, GALON, BENSIN)'
				WHEN r.nm_rek LIKE '%KONSUMSI%' OR r.nm_rek LIKE '%PROLANIS%'
					OR COALESCE(k.nama_kategori, '') LIKE '%WORKSHOP%'
					THEN 'KONSUMSI (PROLANIS, TAMU)'
				ELSE 'JASA LAIN-LAIN (PERAWAT, SOPIR, RUJUKAN, KURIR, ADMIN)'
			END AS kategori,
			SUM(ph.biaya) AS total
		FROM pengeluaran_harian ph
		LEFT JOIN kategori_pengeluaran_harian k ON ph.kode_kategori = k.kode_kategori
		LEFT JOIN rekening r ON k.kd_rek = r.kd_rek
		WHERE YEAR(ph.tanggal) = ? AND MONTH(ph.tanggal) = ?
		GROUP BY d, kategori`

	rows, err := r.db.Query(query, tahun, bulan)
	if err != nil {
		return fmt.Errorf("laporan bulanan pengeluaran: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var day int
		var kategori string
		var total float64
		if err := rows.Scan(&day, &kategori, &total); err != nil {
			return err
		}
		if kategori == "ADMIN BANK" {
			addToDay(resp.Kas, kategori, day, jumlahHari, total)
			continue
		}
		addToDay(resp.Pengeluaran, kategori, day, jumlahHari, total)
	}
	return rows.Err()
}

// fillStatistikPasien mengisi baris jumlah pasien (IGD, rawat jalan, poli
// gigi, poling) dari reg_periksa, dikelompokkan lewat kd_poli/kd_pj.
func (r *keuanganRepository) fillStatistikPasien(resp *ModelsKeuangan.LaporanBulananResponse, bulan, tahun, jumlahHari int) error {
	query := `
		SELECT
			DAY(rp.tgl_registrasi) AS d,
			CASE
				WHEN rp.kd_poli = 'IGDK' AND rp.kd_pj = 'BPJ' THEN 'JUMLAH PASIEN OB-MRS BPJS'
				WHEN rp.kd_poli = 'IGDK' THEN 'JUMLAH PASIEN OB-MRS UMUM'
				WHEN rp.status_lanjut = 'Ranap' THEN 'JUMLAH PASIEN RAWAT INAP'
				WHEN rp.kd_poli = 'U0010' AND rp.kd_pj = 'BPJ' THEN 'JUMLAH PASIEN RJ POLI GIGI (BPJS)'
				WHEN rp.kd_poli = 'U0010' THEN 'JUMLAH PASIEN RJ POLI UMUM (GIGI)'
				WHEN rp.kd_poli = 'U0009' AND rp.kd_pj = 'BPJ' THEN 'JUMLAH PASIEN POLING-BPJS'
				WHEN rp.kd_poli = 'U0009' THEN 'JUMLAH PASIEN POLING-UMUM'
				WHEN rp.status_lanjut = 'Ralan' AND rp.kd_pj = 'BPJ' THEN 'JUMLAH PASIEN RJ BPJS'
				WHEN rp.status_lanjut = 'Ralan' THEN 'JUMLAH PASIEN RJ UMUM'
				ELSE NULL
			END AS kategori,
			COUNT(DISTINCT rp.no_rawat) AS jml
		FROM reg_periksa rp
		WHERE YEAR(rp.tgl_registrasi) = ? AND MONTH(rp.tgl_registrasi) = ?
			AND rp.tgl_registrasi IS NOT NULL AND rp.tgl_registrasi <> '0000-00-00'
		GROUP BY d, kategori
		HAVING kategori IS NOT NULL`

	rows, err := r.db.Query(query, tahun, bulan)
	if err != nil {
		return fmt.Errorf("laporan bulanan statistik pasien: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var day int
		var kategori string
		var jml int
		if err := rows.Scan(&day, &kategori, &jml); err != nil {
			return err
		}
		addToDay(resp.Statistik, kategori, day, jumlahHari, float64(jml))
	}
	return rows.Err()
}

// fillStatistikRawatInap mengisi jumlah hari rawat inap (umum/BPJS) dari
// kamar_inap.lama, dan jumlah pasien pulang (RI - KRS) dari tgl_keluar.
func (r *keuanganRepository) fillStatistikRawatInap(resp *ModelsKeuangan.LaporanBulananResponse, bulan, tahun, jumlahHari int) error {
	hariQuery := `
		SELECT
			DAY(ki.tgl_masuk) AS d,
			CASE WHEN rp.kd_pj = 'BPJ' THEN 'JUMLAH HARI RAWAT INAP BPJS' ELSE 'JUMLAH HARI RAWAT INAP UMUM' END AS kategori,
			COALESCE(SUM(ki.lama), 0) AS jml
		FROM kamar_inap ki
		INNER JOIN reg_periksa rp ON ki.no_rawat = rp.no_rawat
		WHERE YEAR(ki.tgl_masuk) = ? AND MONTH(ki.tgl_masuk) = ?
		GROUP BY d, kategori`

	rows, err := r.db.Query(hariQuery, tahun, bulan)
	if err != nil {
		return fmt.Errorf("laporan bulanan hari rawat inap: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var day int
		var kategori string
		var jml float64
		if err := rows.Scan(&day, &kategori, &jml); err != nil {
			return err
		}
		addToDay(resp.Statistik, kategori, day, jumlahHari, jml)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	krsQuery := `
		SELECT DAY(ki.tgl_keluar) AS d, COUNT(*) AS jml
		FROM kamar_inap ki
		WHERE ki.tgl_keluar IS NOT NULL AND ki.tgl_keluar <> '0000-00-00'
			AND YEAR(ki.tgl_keluar) = ? AND MONTH(ki.tgl_keluar) = ?
		GROUP BY d`
	krsRows, err := r.db.Query(krsQuery, tahun, bulan)
	if err != nil {
		return fmt.Errorf("laporan bulanan ri-krs: %w", err)
	}
	defer krsRows.Close()
	for krsRows.Next() {
		var day, jml int
		if err := krsRows.Scan(&day, &jml); err != nil {
			return err
		}
		addToDay(resp.Statistik, "JUMLAH PASIEN RI - KRS", day, jumlahHari, float64(jml))
	}
	return krsRows.Err()
}

// fillStatistikLab mengisi JUMLAH PX LAB - PKM (kategori 'PK' = Patologi
// Klinik) dan JUMLAH PASIEN POLING-LAB (jumlah pasien unik yang periksa lab).
func (r *keuanganRepository) fillStatistikLab(resp *ModelsKeuangan.LaporanBulananResponse, bulan, tahun, jumlahHari int) error {
	pkmQuery := `
		SELECT DAY(pl.tgl_periksa) AS d, COUNT(*) AS jml
		FROM periksa_lab pl
		WHERE pl.kategori = 'PK' AND YEAR(pl.tgl_periksa) = ? AND MONTH(pl.tgl_periksa) = ?
		GROUP BY d`
	rows, err := r.db.Query(pkmQuery, tahun, bulan)
	if err != nil {
		return fmt.Errorf("laporan bulanan lab pkm: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var day, jml int
		if err := rows.Scan(&day, &jml); err != nil {
			return err
		}
		addToDay(resp.Statistik, "JUMLAH PX LAB - PKM", day, jumlahHari, float64(jml))
	}
	if err := rows.Err(); err != nil {
		return err
	}

	polingLabQuery := `
		SELECT DAY(pl.tgl_periksa) AS d, COUNT(DISTINCT pl.no_rawat) AS jml
		FROM periksa_lab pl
		WHERE YEAR(pl.tgl_periksa) = ? AND MONTH(pl.tgl_periksa) = ?
		GROUP BY d`
	polingRows, err := r.db.Query(polingLabQuery, tahun, bulan)
	if err != nil {
		return fmt.Errorf("laporan bulanan poling lab: %w", err)
	}
	defer polingRows.Close()
	for polingRows.Next() {
		var day, jml int
		if err := polingRows.Scan(&day, &jml); err != nil {
			return err
		}
		addToDay(resp.Statistik, "JUMLAH PASIEN POLING-LAB", day, jumlahHari, float64(jml))
	}
	return polingRows.Err()
}
