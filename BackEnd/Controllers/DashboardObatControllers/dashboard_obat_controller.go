package controllers

import (
	servicesDashboardObat "BackEnd/Services/DashboardObatServices"
	"net/http"

	"github.com/gin-gonic/gin"
)

type DashboardObatController struct {
	svc servicesDashboardObat.DashboardObatService
}

func NewDashboardObatController(svc servicesDashboardObat.DashboardObatService) *DashboardObatController {
	return &DashboardObatController{svc: svc}
}

func (ctrl *DashboardObatController) GetDashboard(c *gin.Context) {
	data, err := ctrl.svc.GetDashboard()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}
