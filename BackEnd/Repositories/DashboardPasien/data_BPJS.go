package repositories

import (
	ModelsPasien "BackEnd/Models/ModelsPasien"
	"fmt"
	"strings"
)

func (r *dashboardRepository) GetBPJSPoliData(
	filter ModelsPasien.BPJSPoliFilter,
) ([]ModelsPasien.DataBPJS, int, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	where, args := r.buildBPJSPoliWhere(filter)

	var total int
	countQuery := `
		SELECT COUNT(DISTINCT rp.no_rawat)
		FROM reg_periksa rp
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		INNER JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
		INNER JOIN penjab pj ON rp.kd_pj = pj.kd_pj
		LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
	` + where
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("hitung pasien per poli: %w", err)
	}

	listArgs := append(args, filter.Limit, filter.Offset)
	listQuery := `
		SELECT
			rp.no_rawat,
			p.no_rkm_medis,
			p.nm_pasien,
			rp.tgl_registrasi,
			rp.jam_reg,
			rp.kd_dokter,
			IFNULL(d.nm_dokter, '-'),
			rp.kd_poli,
			pol.nm_poli,
			rp.kd_pj,
			IFNULL(pj.png_jawab, '-'),
			rp.status_lanjut,
			IFNULL(rp.stts, '-')
		FROM reg_periksa rp
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		INNER JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
		INNER JOIN penjab pj ON rp.kd_pj = pj.kd_pj
		LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
	` + where + `
		ORDER BY rp.tgl_registrasi DESC, rp.jam_reg DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.Query(listQuery, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("pasien per poli: %w", err)
	}
	defer rows.Close()

	var list []ModelsPasien.DataBPJS
	for rows.Next() {
		var row ModelsPasien.DataBPJS
		if err := rows.Scan(
			&row.No_rawat,
			&row.No_rkm_medis,
			&row.Nm_pasien,
			&row.Tgl_registrasi,
			&row.Jam_reg,
			&row.Kd_dokter,
			&row.Nm_dokter,
			&row.Kd_poli,
			&row.Nm_poli,
			&row.Kd_pj,
			&row.Nm_penjamin,
			&row.Status_lanjut,
			&row.Status_rawat,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, row)
	}
	if list == nil {
		list = []ModelsPasien.DataBPJS{}
	}
	return list, total, rows.Err()
}

func (r *dashboardRepository) buildBPJSPoliWhere(
	f ModelsPasien.BPJSPoliFilter,
) (string, []any) {
	var conds []string
	var args []any

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

	if strings.TrimSpace(f.KdPoli) != "" {
		conds = append(conds, "rp.kd_poli = ?")
		args = append(args, strings.TrimSpace(f.KdPoli))
	}

	if strings.TrimSpace(f.Cari) != "" {
		conds = append(conds, `(
			p.nm_pasien LIKE ? OR
			p.no_rkm_medis LIKE ? OR
			pol.nm_poli LIKE ?
		)`)
		like := "%" + strings.TrimSpace(f.Cari) + "%"
		args = append(args, like, like, like)
	}

	if len(conds) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(conds, " AND "), args
}

func (r *dashboardRepository) GetBPJSPoliDataCount(filter ModelsPasien.BPJSPoliFilter) (int, error) {
	where, args := r.buildBPJSPoliWhere(filter)

	extraConditions := `rp.stts = 'Belum' AND rp.kd_poli LIKE '%bpjs%'`
	if where == "" {
		where = " WHERE " + extraConditions
	} else {
		where += " AND " + extraConditions
	}

	var total int
	countQuery := `
		SELECT COUNT(DISTINCT rp.no_rawat)
		FROM reg_periksa rp
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		INNER JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
		INNER JOIN penjab pj ON rp.kd_pj = pj.kd_pj
		LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
	` + where

	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("hitung pasien per poli bpjs belum: %w", err)
	}

	return total, nil
}
