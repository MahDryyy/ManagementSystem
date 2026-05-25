package repositories

import (
	"BackEnd/Models"
	"database/sql"
	"fmt"
	"strings"
)

type DashboardRepository interface {
	GetRingkasan() (Models.DashboardRingkasan, error)
	GetKategoriUmur() ([]Models.KategoriUmurItem, error)
	GetStatusPerawatan() (Models.StatusPerawatan, error)
	GetDaftarPasien(filter Models.PasienFilter) ([]Models.PasienBaris, int, error)
}

type dashboardRepository struct {
	db *sql.DB
}

func NewDashboardRepository(db *sql.DB) DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) GetRingkasan() (Models.DashboardRingkasan, error) {
	var ringkasan Models.DashboardRingkasan

	if err := r.db.QueryRow(`SELECT COUNT(*) FROM pasien`).Scan(&ringkasan.TotalPasienTerdaftar); err != nil {
		return ringkasan, fmt.Errorf("total pasien: %w", err)
	}

	if err := r.db.QueryRow(
		`SELECT COUNT(*) FROM reg_periksa WHERE status_lanjut = ?`,
		Models.StatusLanjutRalan,
	).Scan(&ringkasan.PasienRawatJalan); err != nil {
		return ringkasan, fmt.Errorf("rawat jalan: %w", err)
	}

	if err := r.db.QueryRow(
		`SELECT COUNT(*) FROM reg_periksa WHERE status_lanjut = ?`,
		Models.StatusLanjutRanap,
	).Scan(&ringkasan.PasienRawatInap); err != nil {
		return ringkasan, fmt.Errorf("rawat inap: %w", err)
	}

	return ringkasan, nil
}

func (r *dashboardRepository) GetKategoriUmur() ([]Models.KategoriUmurItem, error) {
	rows, err := r.db.Query(`
		SELECT
			CASE
				WHEN TIMESTAMPDIFF(MONTH, tgl_lahir, CURDATE()) <= 12 THEN ?
				WHEN TIMESTAMPDIFF(MONTH, tgl_lahir, CURDATE()) > 12
					AND TIMESTAMPDIFF(YEAR, tgl_lahir, CURDATE()) BETWEEN 1 AND 6 THEN ?
				WHEN TIMESTAMPDIFF(YEAR, tgl_lahir, CURDATE()) BETWEEN 7 AND 15 THEN ?
				WHEN TIMESTAMPDIFF(YEAR, tgl_lahir, CURDATE()) BETWEEN 16 AND 64 THEN ?
				WHEN TIMESTAMPDIFF(YEAR, tgl_lahir, CURDATE()) >= 65 THEN ?
			END AS kategori,
			COUNT(*) AS jumlah
		FROM pasien
		WHERE tgl_lahir IS NOT NULL AND tgl_lahir <> '0000-00-00'
		GROUP BY kategori
	`,
		Models.KategoriUmurBayiBaruLahir,
		Models.KategoriUmurBalita,
		Models.KategoriUmurPendidikan,
		Models.KategoriUmurProduktif,
		Models.KategoriUmurLanjut,
	)
	if err != nil {
		return nil, fmt.Errorf("kategori umur: %w", err)
	}
	defer rows.Close()

	counts := map[string]int{}
	for rows.Next() {
		var item Models.KategoriUmurItem
		if err := rows.Scan(&item.Kategori, &item.Jumlah); err != nil {
			return nil, err
		}
		counts[item.Kategori] = item.Jumlah
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	order := []string{
		Models.KategoriUmurBayiBaruLahir,
		Models.KategoriUmurBalita,
		Models.KategoriUmurPendidikan,
		Models.KategoriUmurProduktif,
		Models.KategoriUmurLanjut,
	}
	result := make([]Models.KategoriUmurItem, 0, len(order))
	for _, k := range order {
		result = append(result, Models.KategoriUmurItem{Kategori: k, Jumlah: counts[k]})
	}
	return result, nil
}

func (r *dashboardRepository) GetStatusPerawatan() (Models.StatusPerawatan, error) {
	var out Models.StatusPerawatan

	if err := r.db.QueryRow(`
		SELECT COUNT(*) FROM reg_periksa
		WHERE status_lanjut = ? AND stts = 'Belum' AND tgl_registrasi = CURDATE()
	`, Models.StatusLanjutRalan).Scan(&out.RawatJalanAktif); err != nil {
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
		`, Models.StatusLanjutRanap).Scan(&out.RawatInapAktif); err != nil {
			return out, fmt.Errorf("rawat inap aktif: %w", err)
		}
	}

	out.TotalAktif = out.RawatJalanAktif + out.RawatInapAktif
	return out, nil
}

func (r *dashboardRepository) GetDaftarPasien(filter Models.PasienFilter) ([]Models.PasienBaris, int, error) {
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

	var list []Models.PasienBaris
	for rows.Next() {
		var row Models.PasienBaris
		var jk, statusLanjut string
		if err := rows.Scan(
			&row.ID, &row.Nama, &row.NoTelepon, &row.Diagnosa,
			&row.TglLahir, &row.Umur, &jk, &statusLanjut,
			&row.Penjamin, &row.NoRawat,
		); err != nil {
			return nil, 0, err
		}
		row.JenisKelamin = labelJenisKelamin(jk)
		row.Rawat = labelStatusLanjut(statusLanjut)
		list = append(list, row)
	}
	if list == nil {
		list = []Models.PasienBaris{}
	}
	return list, total, rows.Err()
}

func buildPasienFilter(f Models.PasienFilter) (string, []any) {
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

	return " WHERE " + strings.Join(conds, " AND "), args
}

func labelJenisKelamin(jk string) string {
	switch jk {
	case Models.JenisKelaminLaki:
		return "Laki-laki"
	case Models.JenisKelaminPerempuan:
		return "Perempuan"
	default:
		return jk
	}
}

func labelStatusLanjut(status string) string {
	if status == Models.StatusLanjutRanap {
		return "Rawat Inap"
	}
	return "Rawat Jalan"
}
