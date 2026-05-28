package repositories

import (
	ModelsPasien "BackEnd/Models"
	"database/sql"
	"time"
)

// Tanggal masuk/keluar per kunjungan (reg_periksa + kamar_inap untuk Ranap).
const sqlTglMasuk = `CASE
	WHEN rp.status_lanjut = 'Ranap' THEN COALESCE(
		(SELECT MIN(ki.tgl_masuk) FROM kamar_inap ki WHERE ki.no_rawat = rp.no_rawat),
		rp.tgl_registrasi
	)
	ELSE rp.tgl_registrasi
END`

const sqlTglKeluar = `CASE
	WHEN rp.status_lanjut = 'Ranap' THEN (
		SELECT MAX(
			CASE
				WHEN ki.tgl_keluar IS NULL OR ki.tgl_keluar = '0000-00-00' THEN NULL
				ELSE ki.tgl_keluar
			END
		)
		FROM kamar_inap ki
		WHERE ki.no_rawat = rp.no_rawat
	)
	WHEN LOWER(IFNULL(rp.stts, '')) = 'sudah' THEN rp.tgl_registrasi
	ELSE NULL
END`

func nullTimeToPtr(nt sql.NullTime) *time.Time {
	if !nt.Valid {
		return nil
	}
	t := nt.Time
	if t.Year() < 1 {
		return nil
	}
	return &t
}

func applyPasienBarisLabels(row *ModelsPasien.PasienBaris, jk, statusLanjut string) {
	row.JenisKelamin = labelJenisKelamin(jk)
	row.Rawat = labelStatusLanjut(statusLanjut)
	if statusLanjut == "-" {
		row.Rawat = "-"
	}
}

// Subquery diagnosa untuk baris pasien (butuh alias rp.no_rawat).
const sqlDiagnosaSubquery = `IFNULL((
	SELECT GROUP_CONCAT(DISTINCT peny.nm_penyakit ORDER BY dp.prioritas SEPARATOR ', ')
	FROM diagnosa_pasien dp
	INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
	WHERE dp.no_rawat = rp.no_rawat
	LIMIT 3
), '-')`

const sqlRuanganKosong = `''`

// Ruangan rawat inap aktif: nama bangsal · kode kamar (kelas).
const sqlRuanganInap = `IFNULL(CONCAT(
	b.nm_bangsal,
	' · ',
	ki.kd_kamar,
	IF(k.kelas IS NOT NULL AND k.kelas <> '', CONCAT(' (', k.kelas, ')'), '')
), '-')`
