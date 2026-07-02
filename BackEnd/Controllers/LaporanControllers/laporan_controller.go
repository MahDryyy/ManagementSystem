package controllers

import (
	ModelsKeuangan "BackEnd/Models/ModelsKeuangan"
	servicesKeuangan "BackEnd/Services/KeuanganServices"
	servicesDashboardPasien "BackEnd/Services/DashboardPasienServices"
	ModelsPasien "BackEnd/Models/ModelsPasien"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

type LaporanController struct {
	keuanganSvc servicesKeuangan.KeuanganService
	pasienSvc   servicesDashboardPasien.DashboardService
}

func NewLaporanController(
	keuanganSvc servicesKeuangan.KeuanganService,
	pasienSvc servicesDashboardPasien.DashboardService,
) *LaporanController {
	return &LaporanController{
		keuanganSvc: keuanganSvc,
		pasienSvc:   pasienSvc,
	}
}

// ======================== LAPORAN KEUANGAN ========================

// ExportKeuanganCSV generates a CSV export of keuangan (pendapatan) data.
func (ctrl *LaporanController) ExportKeuanganCSV(c *gin.Context) {
	periode := c.DefaultQuery("periode", ModelsKeuangan.PeriodeBulanIni)
	jenisRawat := c.Query("jenis_rawat")

	filter := ModelsKeuangan.PendapatanAkunFilter{
		Periode:    periode,
		JenisRawat: jenisRawat,
		Limit:      10000,
		Offset:     0,
	}

	data, err := ctrl.keuanganSvc.GetPendapatanPerAkun(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filename := fmt.Sprintf("laporan_keuangan_%s_%s.csv", periode, time.Now().Format("20060102"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Cache-Control", "no-cache")

	w := csv.NewWriter(c.Writer)
	defer w.Flush()

	// BOM for Excel UTF-8 compatibility
	c.Writer.WriteString("\xef\xbb\xbf")

	// Header row
	_ = w.Write([]string{
		"No", "Tanggal", "No Rawat", "No Nota", "Nama Pasien",
		"Cara Bayar", "Akun Rekening", "Jenis Rawat", "Total (Rp)",
	})

	for i, row := range data.Data {
		tgl := ""
		if !row.Tanggal.IsZero() {
			tgl = row.Tanggal.Format("02/01/2006")
		}
		jenisLabel := row.JenisRawat
		if jenisLabel == ModelsKeuangan.JenisRawatJalan {
			jenisLabel = "Rawat Jalan"
		} else if jenisLabel == ModelsKeuangan.JenisRawatInap {
			jenisLabel = "Rawat Inap"
		}
		_ = w.Write([]string{
			fmt.Sprintf("%d", i+1),
			tgl,
			row.NoRawat,
			row.NoNota,
			row.NmPasien,
			row.CaraBayar,
			row.AkunRekening,
			jenisLabel,
			formatRupiah(row.Total),
		})
	}

	// Grand total row
	_ = w.Write([]string{"", "", "", "", "", "", "", "GRAND TOTAL", formatRupiah(data.GrandTotal)})
}

// ExportKeuanganSummaryCSV generates a CSV summary (per account & per category).
func (ctrl *LaporanController) ExportKeuanganSummaryCSV(c *gin.Context) {
	periode := c.DefaultQuery("periode", ModelsKeuangan.PeriodeBulanIni)

	// Pemasukan per kategori (ralan vs ranap)
	kategori, err := ctrl.keuanganSvc.GetPemasukanPerKategori(periode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Pendapatan per akun rekening
	filter := ModelsKeuangan.PendapatanAkunFilter{
		Periode: periode,
		Limit:   10000,
		Offset:  0,
	}
	pendapatan, err := ctrl.keuanganSvc.GetPendapatanPerAkun(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filename := fmt.Sprintf("ringkasan_keuangan_%s_%s.csv", periode, time.Now().Format("20060102"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv; charset=utf-8")

	w := csv.NewWriter(c.Writer)
	defer w.Flush()

	c.Writer.WriteString("\xef\xbb\xbf")

	_ = w.Write([]string{"=== RINGKASAN KEUANGAN ===", "Periode: " + periodeLabel(periode)})
	_ = w.Write([]string{})

	_ = w.Write([]string{"PENDAPATAN PER JENIS LAYANAN"})
	_ = w.Write([]string{"Kategori", "Total (Rp)", "Persentase (%)"})
	for _, k := range kategori {
		_ = w.Write([]string{
			k.Kategori,
			formatRupiah(k.Jumlah),
			fmt.Sprintf("%.2f%%", k.Persen),
		})
	}

	_ = w.Write([]string{})
	_ = w.Write([]string{"PENDAPATAN PER AKUN REKENING"})
	_ = w.Write([]string{"Akun Rekening", "Total (Rp)"})
	for _, akun := range pendapatan.PerAkun {
		_ = w.Write([]string{akun.AkunRekening, formatRupiah(akun.Total)})
	}

	_ = w.Write([]string{})
	_ = w.Write([]string{"GRAND TOTAL", formatRupiah(pendapatan.GrandTotal)})
}

// ExportLaporanBulananExcel generates the monthly cash/revenue/expense report
// (KAS, PENDAPATAN, PENGELUARAN, statistik pasien per hari) matching the
// "LAPORAN KEUANGAN (BINUS).xlsx" template layout.
func (ctrl *LaporanController) ExportLaporanBulananExcel(c *gin.Context) {
	now := time.Now()
	bulan, err := strconv.Atoi(c.DefaultQuery("bulan", strconv.Itoa(int(now.Month()))))
	if err != nil || bulan < 1 || bulan > 12 {
		bulan = int(now.Month())
	}
	tahun, err := strconv.Atoi(c.DefaultQuery("tahun", strconv.Itoa(now.Year())))
	if err != nil || tahun < 2000 || tahun > 2100 {
		tahun = now.Year()
	}

	data, err := ctrl.keuanganSvc.GetLaporanBulanan(bulan, tahun)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	f, err := buildLaporanBulananExcel(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filename := fmt.Sprintf("laporan_keuangan_%02d_%d.xlsx", bulan, tahun)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}

// ======================== LAPORAN PASIEN ========================

// ExportPasienCSV generates a CSV export of patient visit data.
func (ctrl *LaporanController) ExportPasienCSV(c *gin.Context) {
	statusLanjut := c.Query("status_lanjut") // Ralan | Ranap | ""
	penjamin := c.Query("penjamin")           // bpjs | umum | ""

	filter := ModelsPasien.PasienFilter{
		StatusLanjut: statusLanjut,
		Penjamin:     penjamin,
		Limit:        10000,
		Offset:       0,
	}

	resp, err := ctrl.pasienSvc.GetDaftarPasien(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filename := fmt.Sprintf("laporan_pasien_%s.csv", time.Now().Format("20060102"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv; charset=utf-8")

	w := csv.NewWriter(c.Writer)
	defer w.Flush()

	c.Writer.WriteString("\xef\xbb\xbf")

	_ = w.Write([]string{fmt.Sprintf("Laporan Data Pasien - Total: %d pasien", resp.Total)})
	_ = w.Write([]string{})
	_ = w.Write([]string{
		"No", "No RM", "Nama Pasien", "Jenis Kelamin", "Umur",
		"Diagnosa", "Jenis Rawat", "Penjamin", "Tanggal Masuk", "Tanggal Keluar",
	})

	for i, row := range resp.Data {
		tglMasuk := ""
		if row.TglMasuk != nil {
			tglMasuk = row.TglMasuk.Format("02/01/2006")
		}
		tglKeluar := ""
		if row.TglKeluar != nil {
			tglKeluar = row.TglKeluar.Format("02/01/2006")
		}
		_ = w.Write([]string{
			fmt.Sprintf("%d", i+1),
			row.NoRkmMedis,
			row.Nama,
			row.JenisKelamin,
			fmt.Sprintf("%d tahun", row.Umur),
			row.Diagnosa,
			row.Rawat,
			row.Penjamin,
			tglMasuk,
			tglKeluar,
		})
	}
}

// ExportPasienSummaryCSV generates a patient summary CSV (demographics & status).
func (ctrl *LaporanController) ExportPasienSummaryCSV(c *gin.Context) {
	periode := c.DefaultQuery("periode", ModelsPasien.PeriodeBulanIni)

	ringkasan, err := ctrl.pasienSvc.GetRingkasan()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	kategoriUmur, err := ctrl.pasienSvc.GetKategoriUmur(periode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	statusPerawatan, err := ctrl.pasienSvc.GetStatusPerawatan()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filename := fmt.Sprintf("ringkasan_pasien_%s_%s.csv", periode, time.Now().Format("20060102"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv; charset=utf-8")

	w := csv.NewWriter(c.Writer)
	defer w.Flush()

	c.Writer.WriteString("\xef\xbb\xbf")

	_ = w.Write([]string{"=== RINGKASAN DATA PASIEN ===", "Periode: " + periodeLabel(periode)})
	_ = w.Write([]string{})

	_ = w.Write([]string{"RINGKASAN TOTAL"})
	_ = w.Write([]string{"Keterangan", "Jumlah"})
	_ = w.Write([]string{"Total Pasien Terdaftar", fmt.Sprintf("%d", ringkasan.TotalPasienTerdaftar)})
	_ = w.Write([]string{"Pasien Rawat Jalan", fmt.Sprintf("%d", ringkasan.PasienRawatJalan)})
	_ = w.Write([]string{"Pasien Rawat Inap", fmt.Sprintf("%d", ringkasan.PasienRawatInap)})

	_ = w.Write([]string{})
	_ = w.Write([]string{"STATUS PERAWATAN AKTIF"})
	_ = w.Write([]string{"Keterangan", "Jumlah"})
	_ = w.Write([]string{"Total Aktif", fmt.Sprintf("%d", statusPerawatan.TotalAktif)})
	_ = w.Write([]string{"Rawat Jalan Aktif", fmt.Sprintf("%d", statusPerawatan.RawatJalanAktif)})
	_ = w.Write([]string{"Rawat Inap Aktif", fmt.Sprintf("%d", statusPerawatan.RawatInapAktif)})

	_ = w.Write([]string{})
	_ = w.Write([]string{"DISTRIBUSI USIA PASIEN"})
	_ = w.Write([]string{"Kategori Usia", "Jumlah Pasien"})
	for _, k := range kategoriUmur {
		_ = w.Write([]string{k.Kategori, fmt.Sprintf("%d", k.Jumlah)})
	}
}

// ======================== HELPERS ========================

func formatRupiah(n float64) string {
	// Format with dot as thousand separator (Indonesian style)
	s := fmt.Sprintf("%.0f", n)
	result := ""
	for i, c := range reverseString(s) {
		if i > 0 && i%3 == 0 {
			result = "." + result
		}
		result = string(c) + result
	}
	return "Rp " + result
}

func reverseString(s string) string {
	runes := []rune(s)
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return string(runes)
}

func periodeLabel(p string) string {
	switch strings.ToLower(p) {
	case "hari_ini":
		return "Hari Ini"
	case "minggu_ini":
		return "Minggu Ini (7 hari terakhir)"
	case "bulan_ini":
		return "Bulan Ini (30 hari terakhir)"
	case "tahun_ini":
		return "Tahun Ini"
	case "semua":
		return "Semua Waktu"
	default:
		return p
	}
}

func (ctrl *LaporanController) ExportPasienExcel(c *gin.Context) {
	periode := c.Query("periode")
	if periode == "" {
		periode = "semua"
	}
	
	data, err := ctrl.pasienSvc.GetSPMPasienData(periode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Group data by Kategori (for sheet name)
	groupedData := make(map[string][]ModelsPasien.SPMPasienRow)
	for _, row := range data {
		key := row.Kategori
		if key == "" {
			key = "Tidak Berkategori"
		}
		groupedData[key] = append(groupedData[key], row)
	}

	f := excelize.NewFile()
	defaultSheet := "Sheet1"

	// New headers including Diagnosa and Umur Kategori
	headers := []string{"Nama", "Tanggal Lahir", "Disabilitas", "NIK", "Jenis Kelamin", "Desa", "Kecamatan", "Keterangan", "Umur Kategori", "Diagnosa", "Nama Ibu"}

	// Iterate over each category and create sheet
	sheetIndex := 0
	for category, patients := range groupedData {
		var sheetName string
		if sheetIndex == 0 {
			// Rename default sheet for first category
			sheetName = category
			f.SetSheetName(defaultSheet, sheetName)
		} else {
			// Create new sheet for subsequent categories
			sheetName = category
			_, err := f.NewSheet(sheetName)
			if err != nil {
				// Handle invalid sheet name by truncating or replacing
				sheetName = fmt.Sprintf("Kategori %d", sheetIndex)
				_, _ = f.NewSheet(sheetName)
			}
		}

		// Write headers
		for i, h := range headers {
			cell, _ := excelize.CoordinatesToCellName(i+1, 1)
			f.SetCellValue(sheetName, cell, h)
		}

		// Write data
		for i, row := range patients {
			rowNum := i + 2
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", rowNum), row.Nama)
			if !row.TglLahir.IsZero() {
				f.SetCellValue(sheetName, fmt.Sprintf("B%d", rowNum), row.TglLahir.Format("02-01-2006"))
			} else {
				f.SetCellValue(sheetName, fmt.Sprintf("B%d", rowNum), "")
			}
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", rowNum), row.Disabilitas)
			f.SetCellValue(sheetName, fmt.Sprintf("D%d", rowNum), row.NIK)
			f.SetCellValue(sheetName, fmt.Sprintf("E%d", rowNum), row.JenisKelamin)
			f.SetCellValue(sheetName, fmt.Sprintf("F%d", rowNum), row.Desa)
			f.SetCellValue(sheetName, fmt.Sprintf("G%d", rowNum), row.Kecamatan)
			f.SetCellValue(sheetName, fmt.Sprintf("H%d", rowNum), row.Ket)
			f.SetCellValue(sheetName, fmt.Sprintf("I%d", rowNum), row.UmurKategori)
			f.SetCellValue(sheetName, fmt.Sprintf("J%d", rowNum), row.Diagnosa)
			f.SetCellValue(sheetName, fmt.Sprintf("K%d", rowNum), row.NamaIbu)
		}

		sheetIndex++
	}

	filename := fmt.Sprintf("data_pasien_spm_%s.xlsx", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}
