package routes

import (
	controllers "BackEnd/Controllers"
	cors "BackEnd/Middleware"
	"net/http"

	"github.com/gin-gonic/gin"
)

func Setup(router *gin.Engine, dashboardCtrl *controllers.DashboardController) {
	router.Use(cors.CorsMiddleware())

	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	pasien := router.Group("/api/dashboard/pasien")
	{
		pasien.GET("", dashboardCtrl.GetDashboard)
		pasien.GET("/ringkasan", dashboardCtrl.GetRingkasan)
		pasien.GET("/kategori-umur", dashboardCtrl.GetKategoriUmur)
		pasien.GET("/status-perawatan", dashboardCtrl.GetStatusPerawatan)
		pasien.GET("/daftar", dashboardCtrl.GetDaftarPasien)
	}
}
