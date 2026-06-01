package repositories

import (
	ModelsKeuangan "BackEnd/Models/ModelsKeuangan"
	"fmt"
)

const tglPeriksaValid = `pl.tgl_periksa IS NOT NULL AND pl.tgl_periksa <> '0000-00-00'`

func (r *keuanganRepository) GetRingkasanPendapatanLaborat() (ModelsKeuangan.RingkasanPendapatanLaborat, error) {
	var ringkasan ModelsKeuangan.RingkasanPendapatanLaborat

	query := `
		SELECT
			COALESCE(SUM(CASE WHEN pl.tgl_periksa = CURDATE() THEN pl.biaya ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN YEARWEEK(pl.tgl_periksa, 1) = YEARWEEK(CURDATE(), 1) THEN pl.biaya ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN pl.tgl_periksa >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN pl.biaya ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN pl.tgl_periksa >= DATE_FORMAT(CURDATE(), '%Y-01-01') THEN pl.biaya ELSE 0 END), 0),
			COALESCE(SUM(pl.biaya), 0)
		FROM periksa_lab pl
		WHERE ` + tglPeriksaValid

	if err := r.db.QueryRow(query).Scan(
		&ringkasan.Harian,
		&ringkasan.Mingguan,
		&ringkasan.Bulanan,
		&ringkasan.Tahunan,
		&ringkasan.Semua,
	); err != nil {
		return ringkasan, fmt.Errorf("ringkasan pendapatan laborat: %w", err)
	}
	return ringkasan, nil
}

func (r *keuanganRepository) GetGrafikPendapatanLaborat(periode string) ([]ModelsKeuangan.GrafikTitik, error) {
	resolved, err := ResolvePeriode(periode)
	if err != nil {
		return nil, err
	}

	groupExpr, whereClause, orderExpr, err := laboratGrouping(resolved)
	if err != nil {
		return nil, err
	}

	// Pakai konkatenasi string — bukan fmt.Sprintf — agar % di DATE_FORMAT MySQL tidak rusak.
	query := `
		SELECT ` + groupExpr + ` AS label, COALESCE(SUM(pl.biaya), 0) AS nilai
		FROM periksa_lab pl
		WHERE ` + tglPeriksaValid + ` AND ` + whereClause + `
		GROUP BY label
		ORDER BY ` + orderExpr

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("grafik pendapatan laborat: %w", err)
	}
	defer rows.Close()

	return scanGrafikTitik(rows)
}

func laboratPeriodeWhere(periode string) (string, error) {
	switch periode {
	case ModelsKeuangan.PeriodeHariIni:
		return `pl.tgl_periksa = CURDATE()`, nil
	case ModelsKeuangan.PeriodeMingguIni:
		return `pl.tgl_periksa >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND pl.tgl_periksa <= CURDATE()`, nil
	case ModelsKeuangan.PeriodeBulanIni:
		return `pl.tgl_periksa >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND pl.tgl_periksa <= CURDATE()`, nil
	case ModelsKeuangan.PeriodeTahunIni:
		return `pl.tgl_periksa >= DATE_FORMAT(CURDATE(), '%Y-01-01') AND pl.tgl_periksa <= CURDATE()`, nil
	case ModelsKeuangan.PeriodeSemuaWaktu:
		return `1=1`, nil
	default:
		return "", fmt.Errorf("periode tidak valid: %s", periode)
	}
}

func laboratGrouping(periode string) (groupExpr, whereClause, orderExpr string, err error) {
	whereClause, err = laboratPeriodeWhere(periode)
	if err != nil {
		return "", "", "", err
	}

	switch periode {
	case ModelsKeuangan.PeriodeHariIni:
		return `CONCAT(LPAD(HOUR(pl.jam), 2, '0'), ':00')`, whereClause, `MIN(pl.jam)`, nil
	case ModelsKeuangan.PeriodeMingguIni:
		return `DATE_FORMAT(pl.tgl_periksa, '%a')`, whereClause, `MIN(pl.tgl_periksa)`, nil
	case ModelsKeuangan.PeriodeBulanIni:
		return `DATE_FORMAT(pl.tgl_periksa, '%d')`, whereClause, `MIN(pl.tgl_periksa)`, nil
	case ModelsKeuangan.PeriodeTahunIni:
		return `DATE_FORMAT(pl.tgl_periksa, '%b')`, whereClause, `MIN(pl.tgl_periksa)`, nil
	case ModelsKeuangan.PeriodeSemuaWaktu:
		return `DATE_FORMAT(pl.tgl_periksa, '%Y')`, whereClause, `MIN(pl.tgl_periksa)`, nil
	default:
		return "", "", "", fmt.Errorf("periode tidak valid: %s", periode)
	}
}
