package controllers

import (
	ModelsPasien "BackEnd/Models/ModelsPasien"
	servicesDashboardPasien "BackEnd/Services/DashboardPasienServices"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type DashboardController struct {
	svc servicesDashboardPasien.DashboardService
}

func NewDashboardController(svc servicesDashboardPasien.DashboardService) *DashboardController {
	return &DashboardController{svc: svc}
}

func (ctrl *DashboardController) GetDashboard(c *gin.Context) {
	filter := parsePasienFilter(c)

	data, err := ctrl.svc.GetDashboard(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *DashboardController) GetRingkasan(c *gin.Context) {
	data, err := ctrl.svc.GetRingkasan()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *DashboardController) GetKategoriUmur(c *gin.Context) {
	periode := c.DefaultQuery("periode", ModelsPasien.PeriodeBulanIni)
	data, err := ctrl.svc.GetKategoriUmur(periode)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "periode tidak valid") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *DashboardController) GetStatusPerawatan(c *gin.Context) {
	data, err := ctrl.svc.GetStatusPerawatan()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *DashboardController) GetDaftarPasien(c *gin.Context) {
	filter := parsePasienFilter(c)

	data, err := ctrl.svc.GetDaftarPasien(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *DashboardController) GetPasienDetail(c *gin.Context) {
	noRkmMedis := c.Param("no_rkm_medis")
	data, err := ctrl.svc.GetPasienDetail(noRkmMedis)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "tidak ditemukan") || strings.Contains(err.Error(), "wajib") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *DashboardController) GetDrilldownPasien(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	filter := ModelsPasien.PasienDrilldownFilter{
		Tipe:       c.Query("tipe"),
		Periode:    c.DefaultQuery("periode", ModelsPasien.PeriodeSemuaWaktu),
		Kategori:   c.Query("kategori"),
		KdPenyakit: c.Query("kd_penyakit"),
		Limit:      limit,
		Offset:     offset,
	}

	data, err := ctrl.svc.GetDrilldownPasien(filter)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "tidak valid") || strings.Contains(err.Error(), "wajib") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *DashboardController) GetBPJSPoli(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	filter := ModelsPasien.BPJSPoliFilter{
		KdPoli:   c.Query("kd_poli"),
		Penjamin: c.Query("penjamin"),
		Cari:     c.Query("cari"),
		Limit:    limit,
		Offset:   offset,
	}

	data, err := ctrl.svc.GetBPJSPoliData(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *DashboardController) GetBPJSPoliCount(c *gin.Context) {
	filter := ModelsPasien.BPJSPoliFilter{
		KdPoli:   c.Query("kd_poli"),
		Penjamin: c.Query("penjamin"),
		Cari:     c.Query("cari"),
	}

	total, err := ctrl.svc.GetBPJSPoliDataCount(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"total": total})
}

func parsePasienFilter(c *gin.Context) ModelsPasien.PasienFilter {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	return ModelsPasien.PasienFilter{
		Cari:         c.Query("cari"),
		NoRkmMedis:   c.Query("no_rkm_medis"),
		JenisKelamin: c.Query("jenis_kelamin"),
		StatusLanjut: c.Query("status_lanjut"),
		Penjamin:     c.Query("penjamin"),
		Limit:        limit,
		Offset:       offset,
	}
}
