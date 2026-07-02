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
	GetSPMPasienData(periode string) ([]ModelsPasien.SPMPasienRow, error)
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

func (r *dashboardRepository) GetSPMPasienData(periode string) ([]ModelsPasien.SPMPasienRow, error) {
	resolved, err := ResolvePeriode(periode)
	if err != nil {
		return nil, err
	}
	andClause, err := periodeRegistrasiAndClause(resolved)
	if err != nil {
		return nil, err
	}

	// Get the age category SQL and args
	umurCaseSQL, umurArgs := kategoriUmurCaseSQL()

	// First, let's get the base pasien data
	var baseQuery string
	var args []any

	if andClause == "" {
		baseQuery = `
			SELECT DISTINCT
				p.no_rkm_medis,
				p.nm_pasien,
				p.tgl_lahir,
				IFNULL(cf.nama_cacat, ''),
				IFNULL(p.no_ktp, ''),
				p.jk,
				IFNULL(p.kelurahanpj, ''),
				IFNULL(p.kecamatanpj, ''),
				'' AS keterangan,
				IFNULL(p.nm_ibu, ''),
				` + umurCaseSQL + ` AS umur_kategori
			FROM pasien p
			LEFT JOIN cacat_fisik cf ON p.cacat_fisik = cf.id
			WHERE p.tgl_lahir IS NOT NULL AND p.tgl_lahir <> '0000-00-00'
			ORDER BY p.nm_pasien ASC
		`
		args = append(args, umurArgs...)
	} else {
		baseQuery = `
			SELECT DISTINCT
				p.no_rkm_medis,
				p.nm_pasien,
				p.tgl_lahir,
				IFNULL(cf.nama_cacat, ''),
				IFNULL(p.no_ktp, ''),
				p.jk,
				IFNULL(p.kelurahanpj, ''),
				IFNULL(p.kecamatanpj, ''),
				'' AS keterangan,
				IFNULL(p.nm_ibu, ''),
				` + umurCaseSQL + ` AS umur_kategori
			FROM reg_periksa rp
			INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
			LEFT JOIN cacat_fisik cf ON p.cacat_fisik = cf.id
			WHERE p.tgl_lahir IS NOT NULL AND p.tgl_lahir <> '0000-00-00'` + andClause + `
			ORDER BY p.nm_pasien ASC
		`
		args = append(args, umurArgs...)
	}

	rows, err := r.db.Query(baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("get base pasien data: %w", err)
	}
	// Materialisasi baris dasar dulu lalu tutup cursor, supaya query batch di
	// bawah tidak berebut koneksi dengan cursor yang masih terbuka.
	type spmBaseRow struct {
		row        ModelsPasien.SPMPasienRow
		noRkmMedis string
	}
	var bases []spmBaseRow

	for rows.Next() {
		var row ModelsPasien.SPMPasienRow
		var noRkmMedis string
		var jk string
		var tglLahir sql.NullTime
		var umurKategori sql.NullString

		if err := rows.Scan(
			&noRkmMedis,
			&row.Nama,
			&tglLahir,
			&row.Disabilitas,
			&row.NIK,
			&jk,
			&row.Desa,
			&row.Kecamatan,
			&row.Ket,
			&row.NamaIbu,
			&umurKategori,
		); err != nil {
			rows.Close()
			return nil, err
		}

		if tglLahir.Valid {
			row.TglLahir = tglLahir.Time
		}
		row.JenisKelamin = labelJenisKelamin(jk)
		row.UmurKategori = umurKategori.String

		bases = append(bases, spmBaseRow{row: row, noRkmMedis: noRkmMedis})
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	// Anti N+1: ambil seluruh diagnosa & keanggotaan kategori khusus dalam
	// segelintir query (bukan 5 query per pasien). Hasil identik & akurat.
	diagnosaByPasien, err := r.batchDiagnosaByPasien(andClause)
	if err != nil {
		return nil, err
	}
	kategoriKhususSets, err := r.batchKategoriKhususSets(andClause)
	if err != nil {
		return nil, err
	}

	var list []ModelsPasien.SPMPasienRow
	for _, b := range bases {
		row := b.row
		row.Diagnosa = diagnosaByPasien[b.noRkmMedis]

		// Collect ALL categories this pasien belongs to
		var categories []string
		// First add the age category
		if row.UmurKategori != "" {
			categories = append(categories, row.UmurKategori)
		}
		// Then add any special categories they qualify for
		for _, kat := range kategoriUmurDisplayOrder() {
			if !isKategoriKhusus(kat) {
				continue
			}
			if set := kategoriKhususSets[kat]; set != nil && set[b.noRkmMedis] {
				categories = append(categories, kat)
			}
		}

		// Add a row for each category
		for _, cat := range categories {
			newRow := row
			newRow.Kategori = cat
			list = append(list, newRow)
		}
	}

	if list == nil {
		list = []ModelsPasien.SPMPasienRow{}
	}
	return list, nil
}

// batchDiagnosaByPasien mengambil daftar diagnosa untuk SEMUA pasien dalam
// periode sekaligus (1 query) — pengganti getDiagnosaPasien yang dulu ditembak
// per pasien (N+1). Hasil: map no_rkm_medis -> "Penyakit A, Penyakit B"
// terurut prioritas, sama persis dengan versi lama.
func (r *dashboardRepository) batchDiagnosaByPasien(andClause string) (map[string]string, error) {
	query := `
		SELECT rp.no_rkm_medis, peny.nm_penyakit, MIN(dp.prioritas) AS prio
		FROM diagnosa_pasien dp
		INNER JOIN reg_periksa rp ON dp.no_rawat = rp.no_rawat
		INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
		WHERE 1=1` + andClause + `
		GROUP BY rp.no_rkm_medis, peny.nm_penyakit
		ORDER BY rp.no_rkm_medis, prio`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("batch diagnosa pasien: %w", err)
	}
	defer rows.Close()

	ordered := map[string][]string{}
	for rows.Next() {
		var noRkmMedis, nmPenyakit string
		var prio sql.NullInt64
		if err := rows.Scan(&noRkmMedis, &nmPenyakit, &prio); err != nil {
			return nil, err
		}
		ordered[noRkmMedis] = append(ordered[noRkmMedis], nmPenyakit)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make(map[string]string, len(ordered))
	for noRkmMedis, names := range ordered {
		out[noRkmMedis] = strings.Join(names, ", ")
	}
	return out, nil
}

// batchKategoriKhususSets mengembalikan, per kategori khusus, himpunan
// no_rkm_medis yang memenuhi syarat dalam periode (1 query per kategori = 4
// query tetap, tidak tergantung jumlah pasien) — pengganti checkKategoriKhusus
// yang dulu ditembak per pasien per kategori (N×4).
func (r *dashboardRepository) batchKategoriKhususSets(andClause string) (map[string]map[string]bool, error) {
	out := map[string]map[string]bool{}

	for _, kat := range kategoriUmurDisplayOrder() {
		if !isKategoriKhusus(kat) {
			continue
		}
		cond, err := kategoriKhususCondition(kat)
		if err != nil {
			return nil, err
		}

		query := `
			SELECT DISTINCT rp.no_rkm_medis
			FROM reg_periksa rp
			WHERE ` + cond + andClause

		rows, err := r.db.Query(query)
		if err != nil {
			return nil, fmt.Errorf("batch kategori %s: %w", kat, err)
		}

		set := map[string]bool{}
		for rows.Next() {
			var noRkmMedis string
			if err := rows.Scan(&noRkmMedis); err != nil {
				rows.Close()
				return nil, err
			}
			set[noRkmMedis] = true
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, err
		}
		rows.Close()
		out[kat] = set
	}

	return out, nil
}
