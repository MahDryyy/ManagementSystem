package controllers

import (
	ModelsObat "BackEnd/Models/ModelsObat"
	servicesDashboardObat "BackEnd/Services/DashboardObatServices"
	"strconv"

	"github.com/gin-gonic/gin"
)

type DashboardObatController struct {
	svc servicesDashboardObat.DashboardObatService
}

func NewDashboardObatController(svc servicesDashboardObat.DashboardObatService) *DashboardObatController {
	return &DashboardObatController{svc: svc}
}

func parseIntDefault(value string, defaultValue int) int {
	if value == "" {
		return defaultValue
	}
	n, err := strconv.Atoi(value)
	if err != nil || n < 1 {
		return defaultValue
	}
	return n
}

func (ctrl *DashboardObatController) GetDashboard(c *gin.Context) {
	key := ModelsObat.DashboardCacheKey{
		GolonganPage:    parseIntDefault(c.Query("golongan_page"), 1),
		GolonganLimit:   parseIntDefault(c.Query("golongan_limit"), 10),
		ActivitiesPage:  parseIntDefault(c.Query("activities_page"), 1),
		ActivitiesLimit: parseIntDefault(c.Query("activities_limit"), 10),
	}

	data, err := ctrl.svc.GetDashboard(key)
	if err != nil {
		c.JSON(500, gin.H{"error": "Gagal memuat dashboard", "detail": err.Error()})
		return
	}
	c.JSON(200, gin.H{"data": data})
}
