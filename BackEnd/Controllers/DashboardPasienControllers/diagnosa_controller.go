package controllers

import (
	ModelsPasien "BackEnd/Models/ModelsPasien"
	servicesDashboardPasien "BackEnd/Services/DashboardPasienServices"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type DiagnosaController struct {
	svc servicesDashboardPasien.DiagnosaService
}

func NewDiagnosaController(svc servicesDashboardPasien.DiagnosaService) *DiagnosaController {
	return &DiagnosaController{svc: svc}
}

func (ctrl *DiagnosaController) GetDiagnosaTerbanyak(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	filter := ModelsPasien.DiagnosaTerbanyakFilter{
		Periode: c.DefaultQuery("periode", ModelsPasien.PeriodeSemuaWaktu),
		Limit:   limit,
	}

	data, err := ctrl.svc.GetDiagnosaTerbanyak(filter)
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
