package repositories

import (
	ModelsKeuangan "BackEnd/Models/ModelsKeuangan"
	ModelsPasien "BackEnd/Models/ModelsPasien"
	"database/sql"
	"fmt"
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

const pendapatanUnionSQL = `
	SELECT
		NULLIF(rp.tgl_registrasi, '0000-00-00') AS tanggal,
		rp.no_rawat,
		nj.no_nota,
		p.nm_pasien,
		IFNULL(pj.png_jawab, '') AS cara_bayar,
		dnj.nama_bayar AS akun_rekening,
		dnj.besar_bayar AS total,
		'` + ModelsKeuangan.JenisRawatJalan + `' AS jenis_rawat
	FROM reg_periksa rp
	INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
	LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj
	INNER JOIN nota_jalan nj ON rp.no_rawat = nj.no_rawat
	INNER JOIN detail_nota_jalan dnj ON rp.no_rawat = dnj.no_rawat
	UNION ALL
	SELECT
		NULLIF(rp.tgl_registrasi, '0000-00-00') AS tanggal,
		rp.no_rawat,
		ni.no_nota,
		p.nm_pasien,
		IFNULL(pj.png_jawab, '') AS cara_bayar,
		dni.nama_bayar AS akun_rekening,
		dni.besar_bayar AS total,
		'` + ModelsKeuangan.JenisRawatInap + `' AS jenis_rawat
	FROM reg_periksa rp
	INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
	LEFT JOIN penjab pj ON rp.kd_pj = pj.kd_pj
	INNER JOIN nota_inap ni ON rp.no_rawat = ni.no_rawat
	INNER JOIN detail_nota_inap dni ON rp.no_rawat = dni.no_rawat
`

// Format tanggal aman untuk driver Go (tanggal invalid di Khanza tidak boleh di-scan ke time.Time).
const tanggalSelectSQL = `IFNULL(DATE_FORMAT(tanggal, '%Y-%m-%d'), '1970-01-01')`

func (r *keuanganRepository) GetPendapatanPerAkun(filter ModelsKeuangan.PendapatanAkunFilter) (ModelsKeuangan.PendapatanAkunResponse, error) {
	var resp ModelsKeuangan.PendapatanAkunResponse
	resp.Limit = filter.Limit
	resp.Offset = filter.Offset

	where, args, err := buildPendapatanWhere(filter)
	if err != nil {
		return resp, err
	}

	countQuery := `SELECT COUNT(*), COALESCE(SUM(total), 0) FROM (` + pendapatanUnionSQL + `) AS pendapatan WHERE tanggal IS NOT NULL` + where
	if err := r.db.QueryRow(countQuery, args...).Scan(&resp.Total, &resp.GrandTotal); err != nil {
		return resp, fmt.Errorf("hitung pendapatan: %w", err)
	}

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

	listArgs := append(append([]any{}, args...), limit, offset)
	listQuery := `
		SELECT ` + tanggalSelectSQL + ` AS tanggal, no_rawat, no_nota, nm_pasien, cara_bayar, akun_rekening, total, jenis_rawat
		FROM (` + pendapatanUnionSQL + `) AS pendapatan
		WHERE tanggal IS NOT NULL` + where + `
		ORDER BY tanggal DESC, no_rawat, no_nota, akun_rekening
		LIMIT ? OFFSET ?`

	rows, err := r.db.Query(listQuery, listArgs...)
	if err != nil {
		return resp, fmt.Errorf("pendapatan per akun: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var row ModelsKeuangan.PendapatanAkunRow
		var tanggalStr string
		if err := rows.Scan(
			&tanggalStr, &row.NoRawat, &row.NoNota, &row.NmPasien,
			&row.CaraBayar, &row.AkunRekening, &row.Total, &row.JenisRawat,
		); err != nil {
			return resp, err
		}
		row.Tanggal = parseTanggal(tanggalStr)
		resp.Data = append(resp.Data, row)
	}
	if resp.Data == nil {
		resp.Data = []ModelsKeuangan.PendapatanAkunRow{}
	}
	if err := rows.Err(); err != nil {
		return resp, err
	}

	perAkunQuery := `
		SELECT akun_rekening, COALESCE(SUM(total), 0)
		FROM (` + pendapatanUnionSQL + `) AS pendapatan
		WHERE tanggal IS NOT NULL` + where + `
		GROUP BY akun_rekening
		ORDER BY SUM(total) DESC`
	akunRows, err := r.db.Query(perAkunQuery, args...)
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

func (r *keuanganRepository) GetRingkasanPemasukan() (ModelsKeuangan.RingkasanPemasukan, error) {
	var ringkasan ModelsKeuangan.RingkasanPemasukan
	base := `SELECT COALESCE(SUM(total), 0) FROM (` + pendapatanUnionSQL + `) AS pendapatan WHERE `

	if err := r.db.QueryRow(base + `DATE(tanggal) = CURDATE()`).Scan(&ringkasan.Harian); err != nil {
		return ringkasan, fmt.Errorf("pemasukan harian: %w", err)
	}
	if err := r.db.QueryRow(base + `YEARWEEK(tanggal, 1) = YEARWEEK(CURDATE(), 1)`).Scan(&ringkasan.Mingguan); err != nil {
		return ringkasan, fmt.Errorf("pemasukan mingguan: %w", err)
	}
	if err := r.db.QueryRow(base + `YEAR(tanggal) = YEAR(CURDATE()) AND MONTH(tanggal) = MONTH(CURDATE())`).Scan(&ringkasan.Bulanan); err != nil {
		return ringkasan, fmt.Errorf("pemasukan bulanan: %w", err)
	}
	return ringkasan, nil
}

func (r *keuanganRepository) GetGrafikPemasukan(granularity string) ([]ModelsKeuangan.GrafikTitik, error) {
	var labelExpr, groupByExpr, whereClause, orderExpr string
	switch granularity {
	case ModelsKeuangan.GrafikGranularityDay:
		whereClause = `tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`
		labelExpr = `DATE_FORMAT(DATE(tanggal), '%d/%m/%Y')`
		groupByExpr = `DATE(tanggal)`
		orderExpr = `DATE(tanggal)`
	case ModelsKeuangan.GrafikGranularityWeek:
		whereClause = `tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 WEEK)`
		labelExpr = `DATE_FORMAT(MIN(tanggal), '%d/%m/%Y')`
		groupByExpr = `YEARWEEK(tanggal, 1)`
		orderExpr = `MIN(tanggal)`
	case ModelsKeuangan.GrafikGranularityMonth:
		whereClause = `tanggal >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)`
		labelExpr = `DATE_FORMAT(MIN(tanggal), '%b %Y')`
		groupByExpr = `YEAR(tanggal), MONTH(tanggal)`
		orderExpr = `MIN(tanggal)`
	default:
		return nil, fmt.Errorf("granularity tidak valid: %s", granularity)
	}

	query := fmt.Sprintf(`
		SELECT %s AS label, COALESCE(SUM(total), 0) AS nilai
		FROM (%s) AS pendapatan
		WHERE %s
		GROUP BY %s
		ORDER BY %s`, labelExpr, pendapatanUnionSQL, whereClause, groupByExpr, orderExpr)

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("grafik pemasukan: %w", err)
	}
	defer rows.Close()

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

func (r *keuanganRepository) GetGrafikPengeluaran(granularity string) ([]ModelsKeuangan.GrafikTitik, error) {
	// Sumber pengeluaran Khanza menyusul; label diselaraskan dengan pemasukan.
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

	groupExpr, whereClause, orderExpr, err := keuanganTotalGrouping(resolved)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT %s AS label, COALESCE(SUM(total), 0) AS nilai
		FROM (%s) AS pendapatan
		WHERE %s
		GROUP BY label
		ORDER BY %s`, groupExpr, pendapatanUnionSQL, whereClause, orderExpr)

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
	andClause, err := periodePendapatanAndClause(resolved)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT jenis_rawat, COALESCE(SUM(total), 0)
		FROM (` + pendapatanUnionSQL + `) AS pendapatan
		WHERE 1=1` + andClause + `
		GROUP BY jenis_rawat`

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

	if err := r.db.QueryRow(`SELECT COUNT(*) FROM (` + pendapatanUnionSQL + `) AS pendapatan`).Scan(&resp.Total); err != nil {
		return resp, fmt.Errorf("hitung histori: %w", err)
	}

	query := `
		SELECT CONCAT(no_rawat, '-', no_nota, '-', akun_rekening) AS id,
			CONCAT(nm_pasien, ' · ', no_nota) AS judul,
			DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal,
			'pemasukan' AS jenis,
			total,
			jenis_rawat
		FROM (` + pendapatanUnionSQL + `) AS pendapatan
		ORDER BY tanggal DESC, no_rawat
		LIMIT ? OFFSET ?`

	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return resp, fmt.Errorf("histori: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item ModelsKeuangan.HistoriItem
		var jenisRawat string
		if err := rows.Scan(&item.ID, &item.Judul, &item.Tanggal, &item.Jenis, &item.Nominal, &jenisRawat); err != nil {
			return resp, err
		}
		item.Kategori = kategoriLabel(jenisRawat)
		resp.Data = append(resp.Data, item)
	}
	if resp.Data == nil {
		resp.Data = []ModelsKeuangan.HistoriItem{}
	}
	return resp, rows.Err()
}

func buildPendapatanWhere(filter ModelsKeuangan.PendapatanAkunFilter) (string, []any, error) {
	var parts []string
	var args []any

	if filter.Periode != "" {
		resolved, err := ResolvePeriode(filter.Periode)
		if err != nil {
			return "", nil, err
		}
		clause, err := periodePendapatanAndClause(resolved)
		if err != nil {
			return "", nil, err
		}
		if c := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(clause), "AND")); c != "" {
			parts = append(parts, c)
		}
	}

	if filter.TanggalDari != "" {
		parts = append(parts, "DATE(tanggal) >= ?")
		args = append(args, filter.TanggalDari)
	}
	if filter.TanggalSampai != "" {
		parts = append(parts, "DATE(tanggal) <= ?")
		args = append(args, filter.TanggalSampai)
	}
	if filter.JenisRawat != "" {
		parts = append(parts, "jenis_rawat = ?")
		args = append(args, filter.JenisRawat)
	}
	if filter.AkunRekening != "" {
		parts = append(parts, "akun_rekening = ?")
		args = append(args, filter.AkunRekening)
	}
	if c := strings.TrimSpace(filter.Cari); c != "" {
		like := "%" + c + "%"
		parts = append(parts, `(nm_pasien LIKE ? OR no_rawat LIKE ? OR no_nota LIKE ? OR akun_rekening LIKE ? OR cara_bayar LIKE ?)`)
		args = append(args, like, like, like, like, like)
	}

	if len(parts) == 0 {
		return "", args, nil
	}
	return " AND " + strings.Join(parts, " AND "), args, nil
}

func periodePendapatanAndClause(periode string) (string, error) {
	clause, err := periodeDateClause(periode)
	if err != nil {
		return "", err
	}
	if clause == "" {
		return "", nil
	}
	trimmed := strings.TrimSpace(clause)
	trimmed = strings.TrimPrefix(trimmed, "WHERE")
	trimmed = strings.ReplaceAll(trimmed, "rp.tgl_registrasi", "tanggal")
	return " AND " + strings.TrimSpace(trimmed), nil
}

func periodeRegistrasiAndClause(periode string) (string, error) {
	return periodePendapatanAndClause(periode)
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
