package repositories

import (
	ModelsPasien "BackEnd/Models/ModelsPasien"
	"database/sql"
	"fmt"
	"strings"
)

type DashboardRepository interface {
	GetRingkasan() (ModelsPasien.DashboardRingkasan, error)
	GetKategoriUmur(periode string) ([]ModelsPasien.KategoriUmurItem, error)
	GetStatusPerawatan() (ModelsPasien.StatusPerawatan, error)
	GetDaftarPasien(filter ModelsPasien.PasienFilter) ([]ModelsPasien.PasienBaris, int, error)
	GetDrilldownPasien(filter ModelsPasien.PasienDrilldownFilter) ([]ModelsPasien.PasienBaris, int, error)
	GetPasienDetail(noRkmMedis string) (ModelsPasien.PasienDetail, error)
	GetBPJSPoliData(filter ModelsPasien.BPJSPoliFilter) ([]ModelsPasien.DataBPJS, int, error)
	GetBPJSPoliDataCount(filter ModelsPasien.BPJSPoliFilter) (int, error)
}

type dashboardRepository struct {
	db *sql.DB
}

func NewDashboardRepository(db *sql.DB) DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) GetRingkasan() (ModelsPasien.DashboardRingkasan, error) {
	var ringkasan ModelsPasien.DashboardRingkasan

	if err := r.db.QueryRow(`SELECT COUNT(*) FROM pasien`).Scan(&ringkasan.TotalPasienTerdaftar); err != nil {
		return ringkasan, fmt.Errorf("total pasien: %w", err)
	}

	if err := r.db.QueryRow(
		`SELECT COUNT(*) FROM reg_periksa WHERE status_lanjut = ?`,
		ModelsPasien.StatusLanjutRalan,
	).Scan(&ringkasan.PasienRawatJalan); err != nil {
		return ringkasan, fmt.Errorf("rawat jalan: %w", err)
	}

	if err := r.db.QueryRow(
		`SELECT COUNT(*) FROM reg_periksa WHERE status_lanjut = ?`,
		ModelsPasien.StatusLanjutRanap,
	).Scan(&ringkasan.PasienRawatInap); err != nil {
		return ringkasan, fmt.Errorf("rawat inap: %w", err)
	}

	return ringkasan, nil
}

func (r *dashboardRepository) GetKategoriUmur(periode string) ([]ModelsPasien.KategoriUmurItem, error) {
	resolved, err := ResolvePeriode(periode)
	if err != nil {
		return nil, err
	}

	counts, err := r.queryKategoriUmurAgeCounts(resolved)
	if err != nil {
		return nil, err
	}

	for _, kategori := range kategoriUmurDisplayOrder() {
		if !isKategoriKhusus(kategori) {
			continue
		}
		n, err := r.countKategoriKhusus(resolved, kategori)
		if err != nil {
			return nil, err
		}
		counts[kategori] = n
	}

	return buildKategoriUmurResult(counts), nil
}

func (r *dashboardRepository) queryKategoriUmurAgeCounts(periode string) (map[string]int, error) {
	andClause, err := periodeRegistrasiAndClause(periode)
	if err != nil {
		return nil, err
	}
	
	caseSQL, args := kategoriUmurCaseSQL()
	caseSQL += ` AS kategori`

	var query string
	if andClause == "" {
		query = `
			SELECT` + caseSQL + `, COUNT(*) AS jumlah
			FROM pasien p
			WHERE p.tgl_lahir IS NOT NULL AND p.tgl_lahir <> '0000-00-00'
			GROUP BY 1`
	} else {
		query = `
			SELECT` + caseSQL + `, COUNT(DISTINCT p.no_rkm_medis) AS jumlah
			FROM reg_periksa rp
			INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
			WHERE p.tgl_lahir IS NOT NULL AND p.tgl_lahir <> '0000-00-00'` + andClause + `
			GROUP BY 1`
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("kategori umur: %w", err)
	}
	defer rows.Close()

	counts := map[string]int{}
	for rows.Next() {
		var kategori string
		var jumlah int
		if err := rows.Scan(&kategori, &jumlah); err != nil {
			return nil, err
		}
		if kategori != "" {
			counts[kategori] = jumlah
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return counts, nil
}

func (r *dashboardRepository) countKategoriKhusus(periode, kategori string) (int, error) {
	cond, err := kategoriKhususCondition(kategori)
	if err != nil {
		return 0, err
	}

	andClause, err := periodeRegistrasiAndClause(periode)
	if err != nil {
		return 0, err
	}

	query := `
		SELECT COUNT(DISTINCT p.no_rkm_medis)
		FROM reg_periksa rp
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		WHERE p.tgl_lahir IS NOT NULL AND p.tgl_lahir <> '0000-00-00'
	` + andClause + ` AND ` + cond

	var total int
	if err := r.db.QueryRow(query).Scan(&total); err != nil {
		return 0, fmt.Errorf("hitung %s: %w", kategori, err)
	}
	return total, nil
}

func (r *dashboardRepository) GetStatusPerawatan() (ModelsPasien.StatusPerawatan, error) {
	var out ModelsPasien.StatusPerawatan

	if err := r.db.QueryRow(`
		SELECT COUNT(*) FROM reg_periksa
		WHERE status_lanjut = ? AND stts = 'Belum' AND tgl_registrasi = CURDATE()
	`, ModelsPasien.StatusLanjutRalan).Scan(&out.RawatJalanAktif); err != nil {
		return out, fmt.Errorf("rawat jalan aktif: %w", err)
	}

	err := r.db.QueryRow(`
		SELECT COUNT(DISTINCT no_rawat) FROM kamar_inap
		WHERE tgl_keluar = '0000-00-00' OR tgl_keluar IS NULL
	`).Scan(&out.RawatInapAktif)
	if err != nil {
		if err := r.db.QueryRow(`
			SELECT COUNT(*) FROM reg_periksa
			WHERE status_lanjut = ? AND stts = 'Belum'
		`, ModelsPasien.StatusLanjutRanap).Scan(&out.RawatInapAktif); err != nil {
			return out, fmt.Errorf("rawat inap aktif: %w", err)
		}
	}

	out.TotalAktif = out.RawatJalanAktif + out.RawatInapAktif
	return out, nil
}

func (r *dashboardRepository) GetDaftarPasien(filter ModelsPasien.PasienFilter) ([]ModelsPasien.PasienBaris, int, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	where, args := buildPasienFilter(filter)

	var total int
	countQuery := `
		SELECT COUNT(DISTINCT rp.no_rawat)
		FROM reg_periksa rp
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj
	` + where
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("hitung daftar: %w", err)
	}

	listArgs := append(args, filter.Limit, filter.Offset)
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

	rows, err := r.db.Query(listQuery, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("daftar pasien: %w", err)
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

func buildPasienFilter(f ModelsPasien.PasienFilter) (string, []any) {
	var conds []string
	var args []any

	conds = append(conds, "1=1")

	if f.Cari != "" {
		conds = append(conds, `(
			p.nm_pasien LIKE ? OR
			p.no_ktp LIKE ? OR
			p.alamat LIKE ? OR
			p.no_rkm_medis LIKE ?
		)`)
		like := "%" + f.Cari + "%"
		args = append(args, like, like, like, like)
	}
	if f.NoRkmMedis != "" {
		conds = append(conds, "p.no_rkm_medis = ?")
		args = append(args, f.NoRkmMedis)
	}
	if f.JenisKelamin != "" {
		conds = append(conds, "p.jk = ?")
		args = append(args, f.JenisKelamin)
	}
	if f.StatusLanjut != "" {
		conds = append(conds, "rp.status_lanjut = ?")
		args = append(args, f.StatusLanjut)
	}
	switch strings.ToLower(f.Penjamin) {
	case ModelsPasien.FilterPenjaminBPJS:
		conds = append(conds, `(
			pj.kd_pj = ?
			OR LOWER(IFNULL(pj.png_jawab, '')) LIKE '%bpjs%'
			OR LOWER(IFNULL(pj.png_jawab, '')) LIKE '%jkn%'
		)`)
		args = append(args, ModelsPasien.KdPjBPJS)
	case ModelsPasien.FilterPenjaminUmum:
		conds = append(conds, `(
			pj.kd_pj = ?
			OR LOWER(IFNULL(pj.png_jawab, '')) LIKE '%umum%'
		)`)
		args = append(args, ModelsPasien.KdPjUmum)
	}

	return " WHERE " + strings.Join(conds, " AND "), args
}

func labelJenisKelamin(jk string) string {
	switch jk {
	case ModelsPasien.JenisKelaminLaki:
		return "Laki-laki"
	case ModelsPasien.JenisKelaminPerempuan:
		return "Perempuan"
	default:
		return jk
	}
}

func labelStatusLanjut(status string) string {
	if status == ModelsPasien.StatusLanjutRanap {
		return "Rawat Inap"
	}
	return "Rawat Jalan"
}
