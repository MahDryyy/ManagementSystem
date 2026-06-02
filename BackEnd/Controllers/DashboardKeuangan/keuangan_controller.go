package controllers

import (
	ModelsKeuangan "BackEnd/Models/ModelsKeuangan"
	servicesKeuangan "BackEnd/Services/KeuanganServices"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type KeuanganController struct {
	svc servicesKeuangan.KeuanganService
}

func NewKeuanganController(svc servicesKeuangan.KeuanganService) *KeuanganController {
	return &KeuanganController{svc: svc}
}

func (ctrl *KeuanganController) GetPendapatanAkun(c *gin.Context) {
	filter := parsePendapatanFilter(c)
	data, err := ctrl.svc.GetPendapatanPerAkun(filter)
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *KeuanganController) GetStrukByNoRawat(c *gin.Context) {
	noRawat := strings.TrimSpace(c.Param("no_rawat"))
	if noRawat == "" {
		noRawat = strings.TrimSpace(c.Query("no_rawat"))
	}
	data, err := ctrl.svc.GetStrukByNoRawat(noRawat)
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *KeuanganController) GetRingkasan(c *gin.Context) {
	data, err := ctrl.svc.GetRingkasanPemasukan()
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *KeuanganController) GetGrafikPemasukan(c *gin.Context) {
	granularity := c.DefaultQuery("granularity", ModelsKeuangan.GrafikGranularityDay)
	data, err := ctrl.svc.GetGrafikPemasukan(granularity)
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *KeuanganController) GetGrafikPengeluaran(c *gin.Context) {
	granularity := c.DefaultQuery("granularity", ModelsKeuangan.GrafikGranularityDay)
	data, err := ctrl.svc.GetGrafikPengeluaran(granularity)
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *KeuanganController) GetKeuanganTotal(c *gin.Context) {
	periode := c.DefaultQuery("periode", ModelsKeuangan.PeriodeBulanIni)
	data, err := ctrl.svc.GetKeuanganTotal(periode)
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *KeuanganController) GetPemasukanKategori(c *gin.Context) {
	periode := c.DefaultQuery("periode", ModelsKeuangan.PeriodeBulanIni)
	data, err := ctrl.svc.GetPemasukanPerKategori(periode)
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *KeuanganController) GetHistori(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	data, err := ctrl.svc.GetHistori(limit, offset)
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *KeuanganController) GetRingkasanPendapatanLaborat(c *gin.Context) {
	data, err := ctrl.svc.GetRingkasanPendapatanLaborat()
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *KeuanganController) GetGrafikPendapatanLaborat(c *gin.Context) {
	periode := c.DefaultQuery("periode", ModelsKeuangan.PeriodeBulanIni)
	data, err := ctrl.svc.GetGrafikPendapatanLaborat(periode)
	if err != nil {
		writeKeuanganError(c, err)
		return
	}
	c.JSON(http.StatusOK, data)
}

func parsePendapatanFilter(c *gin.Context) ModelsKeuangan.PendapatanAkunFilter {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	jenis := c.Query("jenis_rawat")
	if jenis == "ralan" || jenis == "ranap" {
		// ok
	} else {
		jenis = ""
	}
	return ModelsKeuangan.PendapatanAkunFilter{
		Periode:       c.DefaultQuery("periode", ModelsKeuangan.PeriodeBulanIni),
		Cari:          strings.TrimSpace(c.Query("cari")),
		JenisRawat:    jenis,
		AkunRekening:  strings.TrimSpace(c.Query("akun_rekening")),
		TanggalDari:   strings.TrimSpace(c.Query("tanggal_dari")),
		TanggalSampai: strings.TrimSpace(c.Query("tanggal_sampai")),
		Limit:         limit,
		Offset:        offset,
	}
}

func writeKeuanganError(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	if strings.Contains(err.Error(), "tidak valid") {
		status = http.StatusBadRequest
	}
	c.JSON(status, gin.H{"error": err.Error()})
}
