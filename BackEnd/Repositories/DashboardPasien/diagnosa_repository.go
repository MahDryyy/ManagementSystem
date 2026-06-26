package repositories

import (
	ModelsPasien "BackEnd/Models/ModelsPasien"
	"database/sql"
	"fmt"
	"strings"
)

type DiagnosaRepository interface {
	GetDiagnosaTerbanyak(filter ModelsPasien.DiagnosaTerbanyakFilter) ([]ModelsPasien.DiagnosaTerbanyakItem, int, error)
}

type diagnosaRepository struct {
	db *sql.DB
}

func NewDiagnosaRepository(db *sql.DB) DiagnosaRepository {
	return &diagnosaRepository{db: db}
}

func (r *diagnosaRepository) GetDiagnosaTerbanyak(filter ModelsPasien.DiagnosaTerbanyakFilter) ([]ModelsPasien.DiagnosaTerbanyakItem, int, error) {
	periode, err := ResolvePeriode(filter.Periode)
	if err != nil {
		return nil, 0, err
	}
	dateClause, err := periodeDateClause(periode)
	if err != nil {
		return nil, 0, err
	}

	searchClause, searchArgs := diagnosaSearchClause(filter.Cari)

	var total int
	countQuery := `
		SELECT COUNT(*)
		FROM diagnosa_pasien dp
		INNER JOIN reg_periksa rp ON dp.no_rawat = rp.no_rawat
		INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
	` + dateClause + searchClause
	countArgs := append([]any{}, searchArgs...)
	if err := r.db.QueryRow(countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("hitung diagnosa: %w", err)
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}

	listQuery := `
		SELECT
			peny.kd_penyakit,
			peny.nm_penyakit,
			COUNT(*) AS jumlah
		FROM diagnosa_pasien dp
		INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
		INNER JOIN reg_periksa rp ON dp.no_rawat = rp.no_rawat
	` + dateClause + searchClause + `
		GROUP BY peny.kd_penyakit, peny.nm_penyakit
		ORDER BY jumlah DESC
		LIMIT ?
	`

	listArgs := append(append([]any{}, searchArgs...), limit)
	rows, err := r.db.Query(listQuery, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("diagnosa terbanyak: %w", err)
	}
	defer rows.Close()

	var items []ModelsPasien.DiagnosaTerbanyakItem
	for rows.Next() {
		var item ModelsPasien.DiagnosaTerbanyakItem
		if err := rows.Scan(&item.KdPenyakit, &item.NamaPenyakit, &item.Jumlah); err != nil {
			return nil, 0, err
		}
		if total > 0 {
			item.Persentase = round2(float64(item.Jumlah) / float64(total) * 100)
		}
		items = append(items, item)
	}
	if items == nil {
		items = []ModelsPasien.DiagnosaTerbanyakItem{}
	}
	return items, total, rows.Err()
}

func periodeRegistrasiAndClause(periode string) (string, error) {
	clause, err := periodeDateClause(periode)
	if err != nil {
		return "", err
	}
	if clause == "" {
		return "", nil
	}
	trimmed := strings.TrimSpace(clause)
	trimmed = strings.TrimPrefix(trimmed, "WHERE")
	return " AND " + strings.TrimSpace(trimmed), nil
}

func periodeDateClause(periode string) (string, error) {
	switch normalizePeriode(periode) {
	case ModelsPasien.PeriodeHariIni:
		return ` WHERE rp.tgl_registrasi = CURDATE() `, nil
	case ModelsPasien.PeriodeMingguIni:
		return ` WHERE YEARWEEK(rp.tgl_registrasi, 1) = YEARWEEK(CURDATE(), 1) `, nil
	case ModelsPasien.PeriodeBulanIni:
		return ` WHERE YEAR(rp.tgl_registrasi) = YEAR(CURDATE()) AND MONTH(rp.tgl_registrasi) = MONTH(CURDATE()) `, nil
	case ModelsPasien.PeriodeTahunIni:
		return ` WHERE YEAR(rp.tgl_registrasi) = YEAR(CURDATE()) `, nil
	case ModelsPasien.PeriodeSemuaWaktu:
		return "", nil
	default:
		return "", fmt.Errorf("periode tidak valid: %s", periode)
	}
}

func ResolvePeriode(periode string) (string, error) {
	p := normalizePeriode(periode)
	switch p {
	case ModelsPasien.PeriodeHariIni,
		ModelsPasien.PeriodeMingguIni,
		ModelsPasien.PeriodeBulanIni,
		ModelsPasien.PeriodeTahunIni,
		ModelsPasien.PeriodeSemuaWaktu:
		return p, nil
	default:
		return "", fmt.Errorf("periode tidak valid: %s", periode)
	}
}

func normalizePeriode(periode string) string {
	switch periode {
	case "hari_ini", "today", "daily":
		return ModelsPasien.PeriodeHariIni
	case "minggu_ini", "week", "weekly":
		return ModelsPasien.PeriodeMingguIni
	case "bulan_ini", "month", "monthly":
		return ModelsPasien.PeriodeBulanIni
	case "tahun_ini", "year", "annually", "annual":
		return ModelsPasien.PeriodeTahunIni
	case "semua", "semua_waktu", "all", "all_time", "":
		return ModelsPasien.PeriodeSemuaWaktu
	default:
		return periode
	}
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}

func diagnosaSearchClause(cari string) (string, []any) {
	c := strings.TrimSpace(cari)
	if c == "" {
		return "", nil
	}
	like := "%" + c + "%"
	return ` AND (peny.kd_penyakit LIKE ? OR peny.nm_penyakit LIKE ?) `, []any{like, like}
}
