package repositories

import (
	ModelsKeuangan "BackEnd/Models/ModelsKeuangan"
	ModelsPasien "BackEnd/Models/ModelsPasien"
	"database/sql"
	"fmt"
	"sort"
	"strings"
	"time"
)

type KeuanganRepository interface {
	GetPendapatanPerAkun(filter ModelsKeuangan.PendapatanAkunFilter) (ModelsKeuangan.PendapatanAkunResponse, error)
	GetRingkasanPemasukan() (ModelsKeuangan.RingkasanPemasukan, error)
	GetGrafikPemasukan(granularity string) ([]ModelsKeuangan.GrafikTitik, error)
	GetGrafikPengeluaran(granularity string) ([]ModelsKeuangan.GrafikTitik, error)
	GetKeuanganTotal(periode string) ([]ModelsKeuangan.KeuanganTotalTitik, error)
	GetPemasukanPerKategori(periode string) ([]ModelsKeuangan.PemasukanKategoriItem, error)
	GetHistori(limit, offset int) (ModelsKeuangan.HistoriResponse, error)
}

type keuanganRepository struct {
	db *sql.DB
}

func NewKeuanganRepository(db *sql.DB) KeuanganRepository {
	return &keuanganRepository{db: db}
}

// Filter tanggal valid di sumber (index-friendly pada rp.tgl_registrasi).
const tglRegValid = `rp.tgl_registrasi IS NOT NULL AND rp.tgl_registrasi <> '0000-00-00'`

// Batas bawah scan untuk ringkasan harian/mingguan/bulanan dalam satu pass.
const ringkasanMinDate = `LEAST(
	DATE_FORMAT(CURDATE(), '%Y-%m-01'),
	DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
)`

type historiCandidate struct {
	item      ModelsKeuangan.HistoriItem
	sortDate  time.Time
	sortRawat string
}

func (r *keuanganRepository) GetPendapatanPerAkun(filter ModelsKeuangan.PendapatanAkunFilter) (ModelsKeuangan.PendapatanAkunResponse, error) {
	var resp ModelsKeuangan.PendapatanAkunResponse

	where, args, needPasien, needPenjab, needNota, err := buildBranchWhere(filter)
	if err != nil {
		return resp, err
	}

	useJalan, useInap := pendapatanBranches(filter.JenisRawat)

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	resp.Limit = limit
	resp.Offset = offset

	countParts, countArgs := buildLiteUnionParts(useJalan, useInap, where, args, needPasien, needPenjab, needNota, "d.besar_bayar AS total")
	countQuery := `SELECT COUNT(*), COALESCE(SUM(total), 0) FROM (` + strings.Join(countParts, " UNION ALL ") + `) AS pendapatan`
	if err := r.db.QueryRow(countQuery, countArgs...).Scan(&resp.Total, &resp.GrandTotal); err != nil {
		return resp, fmt.Errorf("hitung pendapatan: %w", err)
	}

	rows, err := r.fetchPendapatanRows(useJalan, useInap, where, args, needPasien, needPenjab, needNota, limit, offset)
	if err != nil {
		return resp, err
	}
	resp.Data = rows

	perAkunParts, perAkunArgs := buildLiteUnionParts(useJalan, useInap, where, args, needPasien, needPenjab, needNota, "d.nama_bayar AS akun_rekening, d.besar_bayar AS total")
	perAkunQuery := `
		SELECT akun_rekening, COALESCE(SUM(total), 0)
		FROM (` + strings.Join(perAkunParts, " UNION ALL ") + `) AS pendapatan
		GROUP BY akun_rekening
		ORDER BY SUM(total) DESC`
	akunRows, err := r.db.Query(perAkunQuery, perAkunArgs...)
	if err != nil {
		return resp, nil
	}
	defer akunRows.Close()
	for akunRows.Next() {
		var item ModelsKeuangan.TotalPerAkun
		if err := akunRows.Scan(&item.AkunRekening, &item.Total); err != nil {
			return resp, err
		}
		resp.PerAkun = append(resp.PerAkun, item)
	}
	return resp, nil
}

func (r *keuanganRepository) fetchPendapatanRows(
	useJalan, useInap bool,
	where string, args []any,
	needPasien, needPenjab, needNota bool,
	limit, offset int,
) ([]ModelsKeuangan.PendapatanAkunRow, error) {
	fetchLimit := limit + offset
	var merged []pendapatanCandidate

	if useJalan {
		rows, err := r.queryPendapatanBranch("jalan", where, args, needPasien, needPenjab, needNota, fetchLimit)
		if err != nil {
			return nil, err
		}
		merged = append(merged, rows...)
	}
	if useInap {
		rows, err := r.queryPendapatanBranch("inap", where, args, needPasien, needPenjab, needNota, fetchLimit)
		if err != nil {
			return nil, err
		}
		merged = append(merged, rows...)
	}

	sort.Slice(merged, func(i, j int) bool {
		if !merged[i].sortDate.Equal(merged[j].sortDate) {
			return merged[i].sortDate.After(merged[j].sortDate)
		}
		if merged[i].row.NoRawat != merged[j].row.NoRawat {
			return merged[i].row.NoRawat < merged[j].row.NoRawat
		}
		if merged[i].row.NoNota != merged[j].row.NoNota {
			return merged[i].row.NoNota < merged[j].row.NoNota
		}
		return merged[i].row.AkunRekening < merged[j].row.AkunRekening
	})

	if offset >= len(merged) {
		return []ModelsKeuangan.PendapatanAkunRow{}, nil
	}
	end := offset + limit
	if end > len(merged) {
		end = len(merged)
	}
	out := make([]ModelsKeuangan.PendapatanAkunRow, 0, end-offset)
	for _, c := range merged[offset:end] {
		out = append(out, c.row)
	}
	return out, nil
}

type pendapatanCandidate struct {
	row      ModelsKeuangan.PendapatanAkunRow
	sortDate time.Time
}

func (r *keuanganRepository) queryPendapatanBranch(
	branch, where string, args []any,
	needPasien, needPenjab, needNota bool,
	fetchLimit int,
) ([]pendapatanCandidate, error) {
	var detailTable, notaTable, jenisRawat string
	switch branch {
	case "jalan":
		detailTable, notaTable, jenisRawat = "detail_nota_jalan", "nota_jalan", ModelsKeuangan.JenisRawatJalan
	default:
		detailTable, notaTable, jenisRawat = "detail_nota_inap", "nota_inap", ModelsKeuangan.JenisRawatInap
	}

	joins := fmt.Sprintf(`
		FROM %s d
		INNER JOIN reg_periksa rp ON d.no_rawat = rp.no_rawat
		INNER JOIN %s nj ON d.no_rawat = nj.no_rawat
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj`, detailTable, notaTable)

	query := fmt.Sprintf(`
		SELECT
			IFNULL(DATE_FORMAT(rp.tgl_registrasi, '%%Y-%%m-%%d'), '1970-01-01') AS tanggal,
			rp.no_rawat,
			nj.no_nota,
			p.nm_pasien,
			IFNULL(pj.png_jawab, '') AS cara_bayar,
			d.nama_bayar AS akun_rekening,
			d.besar_bayar AS total,
			'%s' AS jenis_rawat
		%s
		WHERE %s%s
		ORDER BY rp.tgl_registrasi DESC, rp.no_rawat, nj.no_nota, d.nama_bayar
		LIMIT ?`, jenisRawat, joins, tglRegValid, strings.ReplaceAll(where, "dnj.", "d."))

	qArgs := append(append([]any{}, args...), fetchLimit)
	rows, err := r.db.Query(query, qArgs...)
	if err != nil {
		return nil, fmt.Errorf("pendapatan %s: %w", branch, err)
	}
	defer rows.Close()

	var out []pendapatanCandidate
	for rows.Next() {
		var c pendapatanCandidate
		var tanggalStr string
		if err := rows.Scan(
			&tanggalStr, &c.row.NoRawat, &c.row.NoNota, &c.row.NmPasien,
			&c.row.CaraBayar, &c.row.AkunRekening, &c.row.Total, &c.row.JenisRawat,
		); err != nil {
			return nil, err
		}
		c.row.Tanggal = parseTanggal(tanggalStr)
		c.sortDate = c.row.Tanggal
		out = append(out, c)
	}
	return out, rows.Err()
}

func buildLiteUnionParts(
	useJalan, useInap bool,
	where string, args []any,
	needPasien, needPenjab, needNota bool,
	selectExpr string,
) ([]string, []any) {
	var parts []string
	var allArgs []any

	addBranch := func(detailTable, notaTable string) {
		joins := fmt.Sprintf(`
		FROM %s d
		INNER JOIN reg_periksa rp ON d.no_rawat = rp.no_rawat`, detailTable)
	if needNota {
		joins += fmt.Sprintf(`
		INNER JOIN %s nj ON d.no_rawat = nj.no_rawat`, notaTable)
	}
	if needPasien {
		joins += `
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis`
	}
	if needPenjab {
		joins += `
		LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj`
	}
	branchWhere := strings.ReplaceAll(where, "dnj.", "d.")
	parts = append(parts, fmt.Sprintf(`
			SELECT %s
			%s
			WHERE %s%s`, selectExpr, joins, tglRegValid, branchWhere))
		allArgs = append(allArgs, args...)
	}

	if useJalan {
		addBranch("detail_nota_jalan", "nota_jalan")
	}
	if useInap {
		addBranch("detail_nota_inap", "nota_inap")
	}
	return parts, allArgs
}

func (r *keuanganRepository) GetRingkasanPemasukan() (ModelsKeuangan.RingkasanPemasukan, error) {
	var ringkasan ModelsKeuangan.RingkasanPemasukan

	// Satu query, satu scan data bulan/minggu ini — bukan 3× materialisasi UNION penuh.
	query := `
		SELECT
			COALESCE(SUM(CASE WHEN tgl_registrasi = CURDATE() THEN besar_bayar ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN YEARWEEK(tgl_registrasi, 1) = YEARWEEK(CURDATE(), 1) THEN besar_bayar ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN tgl_registrasi >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN besar_bayar ELSE 0 END), 0)
		FROM (
			SELECT rp.tgl_registrasi, dnj.besar_bayar
			FROM detail_nota_jalan dnj
			INNER JOIN reg_periksa rp ON dnj.no_rawat = rp.no_rawat
			WHERE ` + tglRegValid + `
				AND rp.tgl_registrasi >= ` + ringkasanMinDate + `
			UNION ALL
			SELECT rp.tgl_registrasi, dni.besar_bayar
			FROM detail_nota_inap dni
			INNER JOIN reg_periksa rp ON dni.no_rawat = rp.no_rawat
			WHERE ` + tglRegValid + `
				AND rp.tgl_registrasi >= ` + ringkasanMinDate + `
		) pendapatan`

	if err := r.db.QueryRow(query).Scan(&ringkasan.Harian, &ringkasan.Mingguan, &ringkasan.Bulanan); err != nil {
		return ringkasan, fmt.Errorf("ringkasan pemasukan: %w", err)
	}
	return ringkasan, nil
}

func (r *keuanganRepository) GetGrafikPemasukan(granularity string) ([]ModelsKeuangan.GrafikTitik, error) {
	whereClause, labelExpr, groupByExpr, orderExpr, err := grafikGrouping(granularity)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT %s AS label, COALESCE(SUM(total), 0) AS nilai
		FROM (
			SELECT rp.tgl_registrasi AS tanggal, dnj.besar_bayar AS total
			FROM detail_nota_jalan dnj
			INNER JOIN reg_periksa rp ON dnj.no_rawat = rp.no_rawat
			WHERE %s AND %s
			UNION ALL
			SELECT rp.tgl_registrasi, dni.besar_bayar
			FROM detail_nota_inap dni
			INNER JOIN reg_periksa rp ON dni.no_rawat = rp.no_rawat
			WHERE %s AND %s
		) pendapatan
		GROUP BY %s
		ORDER BY %s`,
		labelExpr, tglRegValid, whereClause, tglRegValid, whereClause, groupByExpr, orderExpr)

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("grafik pemasukan: %w", err)
	}
	defer rows.Close()

	return scanGrafikTitik(rows)
}

func grafikGrouping(granularity string) (whereClause, labelExpr, groupByExpr, orderExpr string, err error) {
	switch granularity {
	case ModelsKeuangan.GrafikGranularityDay:
		return `rp.tgl_registrasi >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`,
			`DATE_FORMAT(DATE(tanggal), '%d/%m/%Y')`,
			`DATE(tanggal)`,
			`DATE(tanggal)`,
			nil
	case ModelsKeuangan.GrafikGranularityWeek:
		return `rp.tgl_registrasi >= DATE_SUB(CURDATE(), INTERVAL 6 WEEK)`,
			`DATE_FORMAT(MIN(tanggal), '%d/%m/%Y')`,
			`YEARWEEK(tanggal, 1)`,
			`MIN(tanggal)`,
			nil
	case ModelsKeuangan.GrafikGranularityMonth:
		return `rp.tgl_registrasi >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)`,
			`DATE_FORMAT(MIN(tanggal), '%b %Y')`,
			`YEAR(tanggal), MONTH(tanggal)`,
			`MIN(tanggal)`,
			nil
	default:
		return "", "", "", "", fmt.Errorf("granularity tidak valid: %s", granularity)
	}
}

func (r *keuanganRepository) GetGrafikPengeluaran(granularity string) ([]ModelsKeuangan.GrafikTitik, error) {
	pem, err := r.GetGrafikPemasukan(granularity)
	if err != nil {
		return nil, err
	}
	out := make([]ModelsKeuangan.GrafikTitik, len(pem))
	for i, p := range pem {
		out[i] = ModelsKeuangan.GrafikTitik{Label: p.Label, Nilai: 0}
	}
	return out, nil
}

func (r *keuanganRepository) GetKeuanganTotal(periode string) ([]ModelsKeuangan.KeuanganTotalTitik, error) {
	resolved, err := ResolvePeriode(periode)
	if err != nil {
		return nil, err
	}

	groupExpr, _, orderExpr, err := keuanganTotalGrouping(resolved)
	if err != nil {
		return nil, err
	}

	rpWhere, err := keuanganTotalRegWhere(resolved)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT %s AS label, COALESCE(SUM(total), 0) AS nilai
		FROM (
			SELECT rp.tgl_registrasi AS tanggal, dnj.besar_bayar AS total
			FROM detail_nota_jalan dnj
			INNER JOIN reg_periksa rp ON dnj.no_rawat = rp.no_rawat
			WHERE %s AND %s
			UNION ALL
			SELECT rp.tgl_registrasi, dni.besar_bayar
			FROM detail_nota_inap dni
			INNER JOIN reg_periksa rp ON dni.no_rawat = rp.no_rawat
			WHERE %s AND %s
		) pendapatan
		GROUP BY label
		ORDER BY %s`, groupExpr, tglRegValid, rpWhere, tglRegValid, rpWhere, orderExpr)

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("keuangan total: %w", err)
	}
	defer rows.Close()

	var items []ModelsKeuangan.KeuanganTotalTitik
	for rows.Next() {
		var label string
		var nilai float64
		if err := rows.Scan(&label, &nilai); err != nil {
			return nil, err
		}
		items = append(items, ModelsKeuangan.KeuanganTotalTitik{
			Label:       label,
			Pemasukan:   nilai,
			Pengeluaran: 0,
		})
	}
	if items == nil {
		items = []ModelsKeuangan.KeuanganTotalTitik{}
	}
	return items, rows.Err()
}

func keuanganTotalRegWhere(periode string) (string, error) {
	switch periode {
	case ModelsKeuangan.PeriodeHariIni:
		return `rp.tgl_registrasi = CURDATE()`, nil
	case ModelsKeuangan.PeriodeMingguIni:
		return `rp.tgl_registrasi >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND rp.tgl_registrasi <= CURDATE()`, nil
	case ModelsKeuangan.PeriodeBulanIni:
		return `rp.tgl_registrasi >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND rp.tgl_registrasi <= CURDATE()`, nil
	case ModelsKeuangan.PeriodeTahunIni:
		return `rp.tgl_registrasi >= DATE_FORMAT(CURDATE(), '%Y-01-01') AND rp.tgl_registrasi <= CURDATE()`, nil
	default:
		return "", fmt.Errorf("periode tidak valid: %s", periode)
	}
}

func keuanganTotalGrouping(periode string) (groupExpr, whereClause, orderExpr string, err error) {
	switch periode {
	case ModelsKeuangan.PeriodeHariIni:
		return `CONCAT(LPAD(HOUR(tanggal), 2, '0'), ':00')`,
			`DATE(tanggal) = CURDATE()`,
			`MIN(tanggal)`,
			nil
	case ModelsKeuangan.PeriodeMingguIni:
		return `DATE_FORMAT(tanggal, '%a')`,
			`YEARWEEK(tanggal, 1) = YEARWEEK(CURDATE(), 1)`,
			`MIN(DATE(tanggal))`,
			nil
	case ModelsKeuangan.PeriodeBulanIni:
		return `DATE_FORMAT(tanggal, '%d')`,
			`YEAR(tanggal) = YEAR(CURDATE()) AND MONTH(tanggal) = MONTH(CURDATE())`,
			`MIN(DATE(tanggal))`,
			nil
	case ModelsKeuangan.PeriodeTahunIni:
		return `DATE_FORMAT(tanggal, '%b')`,
			`YEAR(tanggal) = YEAR(CURDATE())`,
			`MIN(tanggal)`,
			nil
	default:
		return "", "", "", fmt.Errorf("periode tidak valid: %s", periode)
	}
}

func (r *keuanganRepository) GetPemasukanPerKategori(periode string) ([]ModelsKeuangan.PemasukanKategoriItem, error) {
	resolved, err := ResolvePeriode(periode)
	if err != nil {
		return nil, err
	}
	rpWhere, err := keuanganTotalRegWhere(resolved)
	if err != nil {
		return nil, err
	}
	if resolved == ModelsPasien.PeriodeSemuaWaktu {
		rpWhere = "1=1"
	}

	query := fmt.Sprintf(`
		SELECT jenis_rawat, COALESCE(SUM(total), 0)
		FROM (
			SELECT d.besar_bayar AS total, '%s' AS jenis_rawat
			FROM detail_nota_jalan d
			INNER JOIN reg_periksa rp ON d.no_rawat = rp.no_rawat
			WHERE %s AND %s
			UNION ALL
			SELECT d.besar_bayar, '%s'
			FROM detail_nota_inap d
			INNER JOIN reg_periksa rp ON d.no_rawat = rp.no_rawat
			WHERE %s AND %s
		) pendapatan
		GROUP BY jenis_rawat`,
		ModelsKeuangan.JenisRawatJalan, tglRegValid, rpWhere,
		ModelsKeuangan.JenisRawatInap, tglRegValid, rpWhere)

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("pemasukan kategori: %w", err)
	}
	defer rows.Close()

	var raw []ModelsKeuangan.PemasukanKategoriItem
	var grand float64
	for rows.Next() {
		var jenis string
		var jumlah float64
		if err := rows.Scan(&jenis, &jumlah); err != nil {
			return nil, err
		}
		grand += jumlah
		raw = append(raw, ModelsKeuangan.PemasukanKategoriItem{
			Kategori: kategoriLabel(jenis),
			Jumlah:   jumlah,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if grand > 0 {
		for i := range raw {
			raw[i].Persen = (raw[i].Jumlah / grand) * 100
		}
	}
	if raw == nil {
		raw = []ModelsKeuangan.PemasukanKategoriItem{}
	}
	return raw, nil
}

func (r *keuanganRepository) GetHistori(limit, offset int) (ModelsKeuangan.HistoriResponse, error) {
	var resp ModelsKeuangan.HistoriResponse
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	resp.Limit = limit
	resp.Offset = offset

	// Hitung total tanpa JOIN pasien/penjab/nota — 1 round-trip.
	countQuery := `
		SELECT
			(SELECT COUNT(*)
			 FROM detail_nota_jalan dnj
			 INNER JOIN reg_periksa rp ON dnj.no_rawat = rp.no_rawat
			 WHERE ` + tglRegValid + `),
			(SELECT COUNT(*)
			 FROM detail_nota_inap dni
			 INNER JOIN reg_periksa rp ON dni.no_rawat = rp.no_rawat
			 WHERE ` + tglRegValid + `)`
	var countJalan, countInap int
	if err := r.db.QueryRow(countQuery).Scan(&countJalan, &countInap); err != nil {
		return resp, fmt.Errorf("hitung histori: %w", err)
	}
	resp.Total = countJalan + countInap

	fetchLimit := limit + offset
	jalanRows, err := r.fetchHistoriBranch("detail_nota_jalan", "nota_jalan", ModelsKeuangan.JenisRawatJalan, fetchLimit)
	if err != nil {
		return resp, err
	}
	inapRows, err := r.fetchHistoriBranch("detail_nota_inap", "nota_inap", ModelsKeuangan.JenisRawatInap, fetchLimit)
	if err != nil {
		return resp, err
	}

	resp.Data = pageHistori(mergeHistori(jalanRows, inapRows), limit, offset)
	return resp, nil
}

func (r *keuanganRepository) fetchHistoriBranch(detailTable, notaTable, jenisRawat string, fetchLimit int) ([]historiCandidate, error) {
	query := fmt.Sprintf(`
		SELECT
			CONCAT(d.no_rawat, '-', nj.no_nota, '-', d.nama_bayar) AS id,
			CONCAT(p.nm_pasien, ' · ', nj.no_nota) AS judul,
			DATE_FORMAT(rp.tgl_registrasi, '%%Y-%%m-%%d') AS tanggal,
			d.besar_bayar AS total,
			rp.tgl_registrasi AS sort_tgl,
			d.no_rawat AS sort_rawat
		FROM %s d
		INNER JOIN reg_periksa rp ON d.no_rawat = rp.no_rawat
		INNER JOIN %s nj ON d.no_rawat = nj.no_rawat
		INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
		WHERE %s
		ORDER BY rp.tgl_registrasi DESC, d.no_rawat
		LIMIT ?`, detailTable, notaTable, tglRegValid)

	rows, err := r.db.Query(query, fetchLimit)
	if err != nil {
		return nil, fmt.Errorf("histori %s: %w", detailTable, err)
	}
	defer rows.Close()

	var out []historiCandidate
	for rows.Next() {
		var c historiCandidate
		var sortTgl sql.NullTime
		if err := rows.Scan(
			&c.item.ID, &c.item.Judul, &c.item.Tanggal,
			&c.item.Nominal, &sortTgl, &c.sortRawat,
		); err != nil {
			return nil, err
		}
		c.item.Jenis = "pemasukan"
		c.item.Kategori = kategoriLabel(jenisRawat)
		if sortTgl.Valid {
			c.sortDate = sortTgl.Time
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func mergeHistori(jalan, inap []historiCandidate) []historiCandidate {
	merged := make([]historiCandidate, 0, len(jalan)+len(inap))
	merged = append(merged, jalan...)
	merged = append(merged, inap...)
	sort.Slice(merged, func(i, j int) bool {
		if !merged[i].sortDate.Equal(merged[j].sortDate) {
			return merged[i].sortDate.After(merged[j].sortDate)
		}
		return merged[i].sortRawat < merged[j].sortRawat
	})
	return merged
}

func pageHistori(rows []historiCandidate, limit, offset int) []ModelsKeuangan.HistoriItem {
	if offset >= len(rows) {
		return []ModelsKeuangan.HistoriItem{}
	}
	end := offset + limit
	if end > len(rows) {
		end = len(rows)
	}
	out := make([]ModelsKeuangan.HistoriItem, 0, end-offset)
	for _, c := range rows[offset:end] {
		out = append(out, c.item)
	}
	return out
}

func pendapatanBranches(jenisRawat string) (jalan, inap bool) {
	switch jenisRawat {
	case ModelsKeuangan.JenisRawatJalan:
		return true, false
	case ModelsKeuangan.JenisRawatInap:
		return false, true
	default:
		return true, true
	}
}

func buildBranchWhere(filter ModelsKeuangan.PendapatanAkunFilter) (where string, args []any, needPasien, needPenjab, needNota bool, err error) {
	var parts []string

	if filter.Periode != "" {
		resolved, err := ResolvePeriode(filter.Periode)
		if err != nil {
			return "", nil, false, false, false, err
		}
		clause, err := registrasiRangeClause(resolved)
		if err != nil {
			return "", nil, false, false, false, err
		}
		if clause != "" {
			parts = append(parts, clause)
		}
	}

	if filter.TanggalDari != "" {
		parts = append(parts, "rp.tgl_registrasi >= ?")
		args = append(args, filter.TanggalDari)
	}
	if filter.TanggalSampai != "" {
		parts = append(parts, "rp.tgl_registrasi <= ?")
		args = append(args, filter.TanggalSampai)
	}
	if filter.AkunRekening != "" {
		parts = append(parts, "d.nama_bayar = ?")
		args = append(args, filter.AkunRekening)
	}
	if c := strings.TrimSpace(filter.Cari); c != "" {
		needPasien, needPenjab, needNota = true, true, true
		like := "%" + c + "%"
		parts = append(parts, `(p.nm_pasien LIKE ? OR rp.no_rawat LIKE ? OR nj.no_nota LIKE ? OR d.nama_bayar LIKE ? OR pj.png_jawab LIKE ?)`)
		args = append(args, like, like, like, like, like)
	}

	if len(parts) == 0 {
		return "", args, needPasien, needPenjab, needNota, nil
	}
	return " AND " + strings.Join(parts, " AND "), args, needPasien, needPenjab, needNota, nil
}

func registrasiRangeClause(periode string) (string, error) {
	switch normalizePeriode(periode) {
	case ModelsPasien.PeriodeHariIni:
		return "rp.tgl_registrasi = CURDATE()", nil
	case ModelsPasien.PeriodeMingguIni:
		return "rp.tgl_registrasi >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND rp.tgl_registrasi <= CURDATE()", nil
	case ModelsPasien.PeriodeBulanIni:
		return "rp.tgl_registrasi >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND rp.tgl_registrasi <= CURDATE()", nil
	case ModelsPasien.PeriodeTahunIni:
		return "rp.tgl_registrasi >= DATE_FORMAT(CURDATE(), '%Y-01-01') AND rp.tgl_registrasi <= CURDATE()", nil
	case ModelsPasien.PeriodeSemuaWaktu:
		return "", nil
	default:
		return "", fmt.Errorf("periode tidak valid: %s", periode)
	}
}

func scanGrafikTitik(rows *sql.Rows) ([]ModelsKeuangan.GrafikTitik, error) {
	var items []ModelsKeuangan.GrafikTitik
	for rows.Next() {
		var t ModelsKeuangan.GrafikTitik
		if err := rows.Scan(&t.Label, &t.Nilai); err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	if items == nil {
		items = []ModelsKeuangan.GrafikTitik{}
	}
	return items, rows.Err()
}

func periodePendapatanAndClause(periode string) (string, error) {
	clause, err := registrasiRangeClause(periode)
	if err != nil {
		return "", err
	}
	if clause == "" {
		return "", nil
	}
	return " AND " + clause, nil
}

func periodeRegistrasiAndClause(periode string) (string, error) {
	return periodePendapatanAndClause(periode)
}

func periodeDateClause(periode string) (string, error) {
	switch normalizePeriode(periode) {
	case ModelsPasien.PeriodeHariIni:
		return ` WHERE rp.tgl_registrasi = CURDATE() `, nil
	case ModelsPasien.PeriodeMingguIni:
		return ` WHERE rp.tgl_registrasi >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND rp.tgl_registrasi <= CURDATE() `, nil
	case ModelsPasien.PeriodeBulanIni:
		return ` WHERE rp.tgl_registrasi >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND rp.tgl_registrasi <= CURDATE() `, nil
	case ModelsPasien.PeriodeTahunIni:
		return ` WHERE rp.tgl_registrasi >= DATE_FORMAT(CURDATE(), '%Y-01-01') AND rp.tgl_registrasi <= CURDATE() `, nil
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
	case "semua", "all", "all_time", "":
		return ModelsPasien.PeriodeSemuaWaktu
	default:
		return periode
	}
}

func parseTanggal(raw string) time.Time {
	raw = strings.TrimSpace(raw)
	if raw == "" || strings.HasPrefix(raw, "0000") {
		return time.Time{}
	}
	if len(raw) >= 10 {
		raw = raw[:10]
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return time.Time{}
	}
	return t
}

func kategoriLabel(jenis string) string {
	switch jenis {
	case ModelsKeuangan.JenisRawatInap:
		return "Pasien Rawat Inap"
	case ModelsKeuangan.JenisRawatJalan:
		return "Rawat Jalan"
	default:
		return jenis
	}
}
