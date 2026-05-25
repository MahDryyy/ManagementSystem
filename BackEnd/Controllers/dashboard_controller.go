package controllers

import (
	"BackEnd/Models"
	"BackEnd/Services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type DashboardController struct {
	svc services.DashboardService
}

func NewDashboardController(svc services.DashboardService) *DashboardController {
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
	data, err := ctrl.svc.GetKategoriUmur()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

func parsePasienFilter(c *gin.Context) Models.PasienFilter {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	return Models.PasienFilter{
		Cari:         c.Query("cari"),
		NoRkmMedis:   c.Query("no_rkm_medis"),
		JenisKelamin: c.Query("jenis_kelamin"),
		StatusLanjut: c.Query("status_lanjut"),
		Limit:        limit,
		Offset:       offset,
	}
}
