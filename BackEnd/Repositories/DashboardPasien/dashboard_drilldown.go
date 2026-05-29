package repositories

import (
	ModelsPasien "BackEnd/Models/ModelsPasien"
	"database/sql"
	"fmt"
)

func (r *dashboardRepository) GetDrilldownPasien(
	f ModelsPasien.PasienDrilldownFilter,
) ([]ModelsPasien.PasienBaris, int, error) {
	if f.Limit <= 0 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	switch f.Tipe {
	case ModelsPasien.DrilldownRingkasanRalan:
		return r.GetDaftarPasien(ModelsPasien.PasienFilter{
			StatusLanjut: ModelsPasien.StatusLanjutRalan,
			Limit:        f.Limit,
			Offset:       f.Offset,
		})
	case ModelsPasien.DrilldownRingkasanRanap:
		return r.GetDaftarPasien(ModelsPasien.PasienFilter{
			StatusLanjut: ModelsPasien.StatusLanjutRanap,
			Limit:        f.Limit,
			Offset:       f.Offset,
		})
	case ModelsPasien.DrilldownRingkasanTotal:
		return r.drilldownTotalTerdaftar(f.Limit, f.Offset)
	case ModelsPasien.DrilldownKategoriUmur:
		return r.drilldownKategoriUmur(f.Periode, f.Kategori, f.Limit, f.Offset)
	case ModelsPasien.DrilldownStatusJalanAktif:
		return r.drilldownStatusJalanAktif(f.Limit, f.Offset)
	case ModelsPasien.DrilldownStatusInapAktif:
		return r.drilldownStatusInapAktif(f.Limit, f.Offset)
	case ModelsPasien.DrilldownDiagnosa:
		return r.drilldownDiagnosa(f.Periode, f.KdPenyakit, f.Limit, f.Offset)
	default:
		return nil, 0, fmt.Errorf("tipe drill-down tidak valid: %s", f.Tipe)
	}
}

func (r *dashboardRepository) drilldownTotalTerdaftar(limit, offset int) ([]ModelsPasien.PasienBaris, int, error) {
	baseWhere := ` WHERE p.tgl_lahir IS NOT NULL AND p.tgl_lahir <> '0000-00-00' `

	var total int
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM pasien p` + baseWhere).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT
			p.no_rkm_medis,
			p.nm_pasien,
			IFNULL(p.no_tlp, ''),
			IFNULL((
				SELECT GROUP_CONCAT(DISTINCT peny.nm_penyakit ORDER BY dp.prioritas SEPARATOR ', ')
				FROM diagnosa_pasien dp
				INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
				WHERE dp.no_rawat = rp.no_rawat
				LIMIT 3
			), '-'),
			p.tgl_lahir,
			TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()),
			p.jk,
			IFNULL(rp.status_lanjut, '-'),
			IFNULL(pj.png_jawab, '-'),
			` + sqlRuanganKosong + `,
			` + sqlTglMasuk + `,
			` + sqlTglKeluar + `,
			IFNULL(rp.no_rawat, '')
		FROM pasien p
		LEFT JOIN reg_periksa rp ON rp.no_rawat = (
			SELECT rp2.no_rawat FROM reg_periksa rp2
			WHERE rp2.no_rkm_medis = p.no_rkm_medis
			ORDER BY rp2.tgl_registrasi DESC, rp2.jam_reg DESC
			LIMIT 1
		)
		LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj
	` + baseWhere + `
		ORDER BY p.nm_pasien ASC
		LIMIT ? OFFSET ?
	`

	return r.queryPasienBaris(query, []any{limit, offset}, total)
}

func (r *dashboardRepository) drilldownKategoriUmur(
	periode, kategori string,
	limit, offset int,
) ([]ModelsPasien.PasienBaris, int, error) {
	if kategori == "" {
		return nil, 0, fmt.Errorf("kategori wajib diisi")
	}

	resolved, err := ResolvePeriode(periode)
	if err != nil {
		return nil, 0, err
	}
	andClause, err := periodeRegistrasiAndClause(resolved)
	if err != nil {
		return nil, 0, err
	}

	caseSQL, caseArgs := kategoriUmurCaseSQL()
	kategoriCond := ` AND (` + caseSQL + `) = ? `
	args := append(caseArgs, kategori)

	var fromSQL string
	if andClause == "" {
		fromSQL = `
			FROM pasien p
			LEFT JOIN reg_periksa rp ON rp.no_rawat = (
				SELECT rp2.no_rawat FROM reg_periksa rp2
				WHERE rp2.no_rkm_medis = p.no_rkm_medis
				ORDER BY rp2.tgl_registrasi DESC, rp2.jam_reg DESC
				LIMIT 1
			)
			LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj
			WHERE p.tgl_lahir IS NOT NULL AND p.tgl_lahir <> '0000-00-00'
		` + kategoriCond
	} else {
		fromSQL = `
			FROM reg_periksa rp
			INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
			LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj
			WHERE p.tgl_lahir IS NOT NULL AND p.tgl_lahir <> '0000-00-00'
		` + andClause + kategoriCond
	}

	var total int
	countQuery := `SELECT COUNT(DISTINCT p.no_rkm_medis) ` + fromSQL
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("hitung kategori umur: %w", err)
	}

	listQuery := `
		SELECT
			p.no_rkm_medis,
			p.nm_pasien,
			IFNULL(p.no_tlp, ''),
			IFNULL((
				SELECT GROUP_CONCAT(DISTINCT peny.nm_penyakit ORDER BY dp.prioritas SEPARATOR ', ')
				FROM diagnosa_pasien dp
				INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
				WHERE dp.no_rawat = rp.no_rawat
				LIMIT 3
			), '-'),
			p.tgl_lahir,
			TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()),
			p.jk,
			IFNULL(rp.status_lanjut, '-'),
			IFNULL(pj.png_jawab, '-'),
			` + sqlRuanganKosong + `,
			` + sqlTglMasuk + `,
			` + sqlTglKeluar + `,
			IFNULL(rp.no_rawat, '')
	` + fromSQL

	if andClause != "" {
		listQuery += `
			GROUP BY p.no_rkm_medis, p.nm_pasien, p.no_tlp, p.tgl_lahir, p.jk, rp.status_lanjut, pj.png_jawab, rp.no_rawat
		`
	}
	listQuery += ` ORDER BY p.nm_pasien ASC LIMIT ? OFFSET ?`

	listArgs := append(args, limit, offset)
	return r.queryPasienBaris(listQuery, listArgs, total)
}

func (r *dashboardRepository) drilldownStatusJalanAktif(limit, offset int) ([]ModelsPasien.PasienBaris, int, error) {
	extra := ` AND rp.status_lanjut = ? AND rp.stts = 'Belum' AND rp.tgl_registrasi = CURDATE() `
	return r.drilldownFromRegPeriksa(extra, []any{ModelsPasien.StatusLanjutRalan}, limit, offset)
}

func (r *dashboardRepository) drilldownStatusInapAktif(limit, offset int) ([]ModelsPasien.PasienBaris, int, error) {
	// Pasien yang masih di kamar_inap (belum pulang)
	fromSQL := `
		FROM kamar_inap ki
		INNER JOIN reg_periksa rp ON ki.no_rawat = rp.no_rawat
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj
		LEFT JOIN kamar k ON ki.kd_kamar = k.kd_kamar
		LEFT JOIN bangsal b ON k.kd_bangsal = b.kd_bangsal
		WHERE ki.tgl_keluar = '0000-00-00' OR ki.tgl_keluar IS NULL
	`

	var total int
	if err := r.db.QueryRow(`SELECT COUNT(DISTINCT p.no_rkm_medis) ` + fromSQL).Scan(&total); err != nil {
		return r.drilldownStatusInapAktifFallback(limit, offset)
	}

	query := `
		SELECT
			p.no_rkm_medis,
			p.nm_pasien,
			IFNULL(p.no_tlp, ''),
			IFNULL((
				SELECT GROUP_CONCAT(DISTINCT peny.nm_penyakit ORDER BY dp.prioritas SEPARATOR ', ')
				FROM diagnosa_pasien dp
				INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
				WHERE dp.no_rawat = rp.no_rawat
				LIMIT 3
			), '-'),
			p.tgl_lahir,
			TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()),
			p.jk,
			rp.status_lanjut,
			IFNULL(pj.png_jawab, '-'),
			` + sqlRuanganInap + `,
			ki.tgl_masuk,
			IF(ki.tgl_keluar = '0000-00-00' OR ki.tgl_keluar IS NULL, NULL, ki.tgl_keluar),
			rp.no_rawat
	` + fromSQL + `
		GROUP BY p.no_rkm_medis, p.nm_pasien, p.no_tlp, p.tgl_lahir, p.jk, rp.status_lanjut, pj.png_jawab, b.nm_bangsal, ki.kd_kamar, k.kelas, rp.no_rawat
		ORDER BY b.nm_bangsal ASC, ki.kd_kamar ASC
		LIMIT ? OFFSET ?
	`
	return r.queryPasienBaris(query, []any{limit, offset}, total)
}

func (r *dashboardRepository) drilldownStatusInapAktifFallback(limit, offset int) ([]ModelsPasien.PasienBaris, int, error) {
	extra := ` AND rp.status_lanjut = ? AND rp.stts = 'Belum' `
	return r.drilldownFromRegPeriksa(extra, []any{ModelsPasien.StatusLanjutRanap}, limit, offset)
}

func (r *dashboardRepository) drilldownFromRegPeriksa(
	extraWhere string,
	extraArgs []any,
	limit, offset int,
) ([]ModelsPasien.PasienBaris, int, error) {
	where := ` WHERE 1=1 ` + extraWhere

	var total int
	countQuery := `
		SELECT COUNT(DISTINCT rp.no_rawat)
		FROM reg_periksa rp
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
	` + where
	if err := r.db.QueryRow(countQuery, extraArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := `
		SELECT
			p.no_rkm_medis,
			p.nm_pasien,
			IFNULL(p.no_tlp, ''),
			IFNULL((
				SELECT GROUP_CONCAT(DISTINCT peny.nm_penyakit ORDER BY dp.prioritas SEPARATOR ', ')
				FROM diagnosa_pasien dp
				INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
				WHERE dp.no_rawat = rp.no_rawat
				LIMIT 3
			), '-'),
			p.tgl_lahir,
			TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()),
			p.jk,
			rp.status_lanjut,
			IFNULL(pj.png_jawab, '-'),
			` + sqlRuanganKosong + `,
			` + sqlTglMasuk + `,
			` + sqlTglKeluar + `,
			rp.no_rawat
		FROM reg_periksa rp
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj
	` + where + `
		ORDER BY rp.tgl_registrasi DESC, rp.jam_reg DESC
		LIMIT ? OFFSET ?
	`

	listArgs := append(extraArgs, limit, offset)
	return r.queryPasienBaris(listQuery, listArgs, total)
}

func (r *dashboardRepository) drilldownDiagnosa(
	periode, kdPenyakit string,
	limit, offset int,
) ([]ModelsPasien.PasienBaris, int, error) {
	if kdPenyakit == "" {
		return nil, 0, fmt.Errorf("kd_penyakit wajib diisi")
	}

	resolved, err := ResolvePeriode(periode)
	if err != nil {
		return nil, 0, err
	}
	andClause, err := periodeRegistrasiAndClause(resolved)
	if err != nil {
		return nil, 0, err
	}

	where := ` WHERE dp.kd_penyakit = ? ` + andClause
	args := []any{kdPenyakit}

	var total int
	countQuery := `
		SELECT COUNT(DISTINCT rp.no_rawat)
		FROM diagnosa_pasien dp
		INNER JOIN reg_periksa rp ON dp.no_rawat = rp.no_rawat
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
	` + where
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("hitung diagnosa drill-down: %w", err)
	}

	listQuery := `
		SELECT
			p.no_rkm_medis,
			p.nm_pasien,
			IFNULL(p.no_tlp, ''),
			IFNULL(peny.nm_penyakit, '-'),
			p.tgl_lahir,
			TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()),
			p.jk,
			rp.status_lanjut,
			IFNULL(pj.png_jawab, '-'),
			` + sqlRuanganKosong + `,
			` + sqlTglMasuk + `,
			` + sqlTglKeluar + `,
			rp.no_rawat
		FROM diagnosa_pasien dp
		INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
		INNER JOIN reg_periksa rp ON dp.no_rawat = rp.no_rawat
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj
	` + where + `
		ORDER BY rp.tgl_registrasi DESC, rp.jam_reg DESC
		LIMIT ? OFFSET ?
	`

	listArgs := append(args, limit, offset)
	return r.queryPasienBaris(listQuery, listArgs, total)
}

func (r *dashboardRepository) queryPasienBaris(
	query string,
	args []any,
	total int,
) ([]ModelsPasien.PasienBaris, int, error) {
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []ModelsPasien.PasienBaris
	for rows.Next() {
		var row ModelsPasien.PasienBaris
		var jk, statusLanjut string
		var tglMasuk, tglKeluar sql.NullTime
		if err := rows.Scan(
			&row.ID, &row.Nama, &row.NoTelepon, &row.Diagnosa,
			&row.TglLahir, &row.Umur, &jk, &statusLanjut,
			&row.Penjamin, &row.Ruangan, &tglMasuk, &tglKeluar, &row.NoRawat,
		); err != nil {
			return nil, 0, err
		}
		row.TglMasuk = nullTimeToPtr(tglMasuk)
		row.TglKeluar = nullTimeToPtr(tglKeluar)
		applyPasienBarisLabels(&row, jk, statusLanjut)
		list = append(list, row)
	}
	if list == nil {
		list = []ModelsPasien.PasienBaris{}
	}
	return list, total, rows.Err()
}

func kategoriUmurCaseSQL() (string, []any) {
	caseSQL := `
		CASE
			WHEN TIMESTAMPDIFF(MONTH, p.tgl_lahir, CURDATE()) <= 12 THEN ?
			WHEN TIMESTAMPDIFF(MONTH, p.tgl_lahir, CURDATE()) > 12
				AND TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()) BETWEEN 1 AND 6 THEN ?
			WHEN TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()) BETWEEN 7 AND 15 THEN ?
			WHEN TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()) BETWEEN 16 AND 64 THEN ?
			WHEN TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()) >= 65 THEN ?
		END`
	args := []any{
		ModelsPasien.KategoriUmurBayiBaruLahir,
		ModelsPasien.KategoriUmurBalita,
		ModelsPasien.KategoriUmurPendidikan,
		ModelsPasien.KategoriUmurProduktif,
		ModelsPasien.KategoriUmurLanjut,
	}
	return caseSQL, args
}
