package controllers

import (
	ModelsKeuangan "BackEnd/Models/ModelsKeuangan"
	"fmt"

	"github.com/xuri/excelize/v2"
)

const sheetLaporanBulanan = "Laporan"

// buildLaporanBulananExcel merapikan data.Kas/Pendapatan/Pengeluaran/Statistik
// ke layout yang sama dengan template "LAPORAN KEUANGAN (BINUS).xlsx":
// kolom A=label, B=SALDO (saldo awal, diisi manual), C..=tanggal 1..N,
// kolom terakhir=JUMLAH. Baris saldo kas & total tetap pakai formula Excel
// (bukan nilai statis) supaya kalau user isi SALDO/SETOR OWNER/dst secara
// manual, seluruh total ikut ter-update otomatis.
func buildLaporanBulananExcel(data ModelsKeuangan.LaporanBulananResponse) (*excelize.File, error) {
	f := excelize.NewFile()
	if err := f.SetSheetName("Sheet1", sheetLaporanBulanan); err != nil {
		return nil, err
	}

	jumlahHari := data.JumlahHari
	const (
		labelCol    = 1 // A
		saldoCol    = 2 // B
		firstDayCol = 3 // C
	)
	totalCol := firstDayCol + jumlahHari

	colName := func(col int) string {
		name, _ := excelize.ColumnNumberToName(col)
		return name
	}
	cellAt := func(col, row int) string {
		return fmt.Sprintf("%s%d", colName(col), row)
	}
	dayCol := func(dayIdx int) int { return firstDayCol + dayIdx } // dayIdx 0-based

	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#BDD7EE"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	sectionStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 11, Color: "#1F4E78"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#DCE6F1"}, Pattern: 1},
	})
	labelStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Size: 10},
	})
	dataStyle, _ := f.NewStyle(&excelize.Style{NumFmt: 3}) // #,##0
	intStyle, _ := f.NewStyle(&excelize.Style{NumFmt: 1})  // 0
	totalValStyle, _ := f.NewStyle(&excelize.Style{
		Font:   &excelize.Font{Bold: true},
		Fill:   excelize.Fill{Type: "pattern", Color: []string{"#FCE4D6"}, Pattern: 1},
		NumFmt: 3,
	})
	totalLabelStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#FCE4D6"}, Pattern: 1},
	})

	row := 1

	// ── Header row: KETERANGAN | SALDO | 1..N | JUMLAH ──
	f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, row), "KETERANGAN")
	f.SetCellValue(sheetLaporanBulanan, cellAt(saldoCol, row), "SALDO")
	for d := 0; d < jumlahHari; d++ {
		f.SetCellValue(sheetLaporanBulanan, cellAt(dayCol(d), row), d+1)
	}
	f.SetCellValue(sheetLaporanBulanan, cellAt(totalCol, row), "JUMLAH")
	f.SetCellStyle(sheetLaporanBulanan, cellAt(labelCol, row), cellAt(totalCol, row), titleStyle)
	row++

	writeSectionHeader := func(title string) {
		f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, row), title)
		f.MergeCell(sheetLaporanBulanan, cellAt(labelCol, row), cellAt(totalCol, row))
		f.SetCellStyle(sheetLaporanBulanan, cellAt(labelCol, row), cellAt(totalCol, row), sectionStyle)
		row++
	}

	// writeDataRow menulis satu baris kategori (nilai harian + formula JUMLAH=SUM hari).
	writeDataRow := func(label string, values []float64, style int) int {
		r := row
		f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, r), label)
		f.SetCellStyle(sheetLaporanBulanan, cellAt(labelCol, r), cellAt(labelCol, r), labelStyle)
		for d := 0; d < jumlahHari; d++ {
			v := 0.0
			if values != nil && d < len(values) {
				v = values[d]
			}
			c := cellAt(dayCol(d), r)
			f.SetCellValue(sheetLaporanBulanan, c, v)
			f.SetCellStyle(sheetLaporanBulanan, c, c, style)
		}
		sumFormula := fmt.Sprintf("SUM(%s:%s)", cellAt(firstDayCol, r), cellAt(dayCol(jumlahHari-1), r))
		f.SetCellFormula(sheetLaporanBulanan, cellAt(totalCol, r), sumFormula)
		f.SetCellStyle(sheetLaporanBulanan, cellAt(totalCol, r), cellAt(totalCol, r), style)
		row++
		return r
	}

	// ══════════════════════ KAS ══════════════════════
	writeSectionHeader("KAS")
	kasDitanganRow := row
	row++
	kasDiBankRow := row
	row++

	kasRowNum := make(map[string]int, len(ModelsKeuangan.LaporanBulananKasRows))
	for _, label := range ModelsKeuangan.LaporanBulananKasRows {
		kasRowNum[label] = writeDataRow(label, data.Kas[label], dataStyle)
	}

	totalKasRow := row
	f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, totalKasRow), "TOTAL KAS")
	f.SetCellStyle(sheetLaporanBulanan, cellAt(labelCol, totalKasRow), cellAt(totalCol, totalKasRow), totalLabelStyle)
	row++
	row++ // blank separator row

	// ══════════════════════ A. PENDAPATAN ══════════════════════
	writeSectionHeader("A. PENDAPATAN")
	firstPendapatanRow := row
	for _, label := range ModelsKeuangan.LaporanBulananPendapatanRows {
		writeDataRow(label, data.Pendapatan[label], dataStyle)
	}
	lastPendapatanRow := row - 1

	totalPendapatanRow := row
	f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, totalPendapatanRow), "TOTAL PENDAPATAN")
	row++
	pendapatanKomulatifRow := row
	f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, pendapatanKomulatifRow), "PENDAPATAN KOMULATIF")
	row++
	row++ // blank separator row

	// ══════════════════════ B. PENGELUARAN ══════════════════════
	writeSectionHeader("B. PENGELUARAN")
	firstPengeluaranRow := row
	for _, label := range ModelsKeuangan.LaporanBulananPengeluaranRows {
		writeDataRow(label, data.Pengeluaran[label], dataStyle)
	}
	lastPengeluaranRow := row - 1

	totalPengeluaranRow := row
	f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, totalPengeluaranRow), "TOTAL PENGELUARAN")
	row++
	komulatifPengeluaranRow := row
	f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, komulatifPengeluaranRow), "KOMULATIF PENGELUARAN")
	row++
	row++ // blank separator row

	// ── Formula baris TOTAL/KOMULATIF PENDAPATAN & PENGELUARAN ──
	for d := 0; d < jumlahHari; d++ {
		c := dayCol(d)
		f.SetCellFormula(sheetLaporanBulanan, cellAt(c, totalPendapatanRow),
			fmt.Sprintf("SUM(%s:%s)", cellAt(c, firstPendapatanRow), cellAt(c, lastPendapatanRow)))
		f.SetCellFormula(sheetLaporanBulanan, cellAt(c, totalPengeluaranRow),
			fmt.Sprintf("SUM(%s:%s)", cellAt(c, firstPengeluaranRow), cellAt(c, lastPengeluaranRow)))

		if d == 0 {
			f.SetCellFormula(sheetLaporanBulanan, cellAt(c, pendapatanKomulatifRow), cellAt(c, totalPendapatanRow))
			f.SetCellFormula(sheetLaporanBulanan, cellAt(c, komulatifPengeluaranRow), cellAt(c, totalPengeluaranRow))
		} else {
			prev := dayCol(d - 1)
			f.SetCellFormula(sheetLaporanBulanan, cellAt(c, pendapatanKomulatifRow),
				fmt.Sprintf("%s+%s", cellAt(c, totalPendapatanRow), cellAt(prev, pendapatanKomulatifRow)))
			f.SetCellFormula(sheetLaporanBulanan, cellAt(c, komulatifPengeluaranRow),
				fmt.Sprintf("%s+%s", cellAt(c, totalPengeluaranRow), cellAt(prev, komulatifPengeluaranRow)))
		}
	}
	f.SetCellFormula(sheetLaporanBulanan, cellAt(totalCol, totalPendapatanRow),
		fmt.Sprintf("SUM(%s:%s)", cellAt(firstDayCol, totalPendapatanRow), cellAt(dayCol(jumlahHari-1), totalPendapatanRow)))
	f.SetCellFormula(sheetLaporanBulanan, cellAt(totalCol, totalPengeluaranRow),
		fmt.Sprintf("SUM(%s:%s)", cellAt(firstDayCol, totalPengeluaranRow), cellAt(dayCol(jumlahHari-1), totalPengeluaranRow)))
	// JUMLAH kumulatif = nilai kumulatif hari terakhir (= total sebulan).
	f.SetCellFormula(sheetLaporanBulanan, cellAt(totalCol, pendapatanKomulatifRow), cellAt(dayCol(jumlahHari-1), pendapatanKomulatifRow))
	f.SetCellFormula(sheetLaporanBulanan, cellAt(totalCol, komulatifPengeluaranRow), cellAt(dayCol(jumlahHari-1), komulatifPengeluaranRow))

	for _, r := range []int{totalPendapatanRow, pendapatanKomulatifRow, totalPengeluaranRow, komulatifPengeluaranRow} {
		f.SetCellStyle(sheetLaporanBulanan, cellAt(firstDayCol, r), cellAt(totalCol, r), totalValStyle)
		f.SetCellStyle(sheetLaporanBulanan, cellAt(labelCol, r), cellAt(labelCol, r), totalLabelStyle)
	}

	// ── Formula baris KAS (bergantung pada TOTAL PENDAPATAN/PENGELUARAN di atas) ──
	setorBank := kasRowNum["SETOR BANK/TRANSFERAN"]
	bungaBank := kasRowNum["BUNGA BANK"]
	ambilBank := kasRowNum["AMBIL UANG BANK"]
	adminBank := kasRowNum["ADMIN BANK"]
	setorOwner := kasRowNum["SETOR OWNER dari Kas Bank"]
	setorManagemen := kasRowNum["SETOR MANAGEMEN  dari Kas Bank"]

	for d := 0; d < jumlahHari; d++ {
		c := dayCol(d)
		prevKasDitangan := cellAt(saldoCol, kasDitanganRow)
		prevKasDiBank := cellAt(saldoCol, kasDiBankRow)
		if d > 0 {
			prevKasDitangan = cellAt(dayCol(d-1), kasDitanganRow)
			prevKasDiBank = cellAt(dayCol(d-1), kasDiBankRow)
		}
		f.SetCellFormula(sheetLaporanBulanan, cellAt(c, kasDitanganRow),
			fmt.Sprintf("%s+%s-%s-%s+%s",
				prevKasDitangan, cellAt(c, totalPendapatanRow), cellAt(c, totalPengeluaranRow),
				cellAt(c, setorBank), cellAt(c, ambilBank)))
		f.SetCellFormula(sheetLaporanBulanan, cellAt(c, kasDiBankRow),
			fmt.Sprintf("%s+%s+%s-%s-%s-%s-%s",
				prevKasDiBank, cellAt(c, setorBank), cellAt(c, bungaBank), cellAt(c, ambilBank),
				cellAt(c, adminBank), cellAt(c, setorOwner), cellAt(c, setorManagemen)))
		f.SetCellFormula(sheetLaporanBulanan, cellAt(c, totalKasRow),
			fmt.Sprintf("%s+%s", cellAt(c, kasDitanganRow), cellAt(c, kasDiBankRow)))
	}
	// JUMLAH untuk baris saldo kas = saldo akhir bulan (hari terakhir), bukan penjumlahan.
	f.SetCellFormula(sheetLaporanBulanan, cellAt(totalCol, kasDitanganRow), cellAt(dayCol(jumlahHari-1), kasDitanganRow))
	f.SetCellFormula(sheetLaporanBulanan, cellAt(totalCol, kasDiBankRow), cellAt(dayCol(jumlahHari-1), kasDiBankRow))
	f.SetCellFormula(sheetLaporanBulanan, cellAt(totalCol, totalKasRow), cellAt(dayCol(jumlahHari-1), totalKasRow))

	f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, kasDitanganRow), "KAS DI TANGAN")
	f.SetCellValue(sheetLaporanBulanan, cellAt(labelCol, kasDiBankRow), "KAS DI BANK")
	for _, r := range []int{kasDitanganRow, kasDiBankRow, totalKasRow} {
		f.SetCellStyle(sheetLaporanBulanan, cellAt(firstDayCol, r), cellAt(totalCol, r), totalValStyle)
		f.SetCellStyle(sheetLaporanBulanan, cellAt(labelCol, r), cellAt(labelCol, r), totalLabelStyle)
	}

	// ══════════════════════ STATISTIK PASIEN ══════════════════════
	writeSectionHeader("STATISTIK PASIEN")
	for i, label := range ModelsKeuangan.LaporanBulananStatistikRows {
		writeDataRow(label, data.Statistik[label], intStyle)
		if i == 6 || i == 15 {
			row++ // blank separator, mengikuti pengelompokan pada template asli
		}
	}

	f.SetColWidth(sheetLaporanBulanan, colName(labelCol), colName(labelCol), 46)
	f.SetColWidth(sheetLaporanBulanan, colName(saldoCol), colName(totalCol), 11)
	if idx, err := f.GetSheetIndex(sheetLaporanBulanan); err == nil {
		f.SetActiveSheet(idx)
	}

	return f, nil
}
