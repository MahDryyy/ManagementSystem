package routes

import (
	controllers "BackEnd/Controllers"
	controllersKeuangan "BackEnd/Controllers/DashboardKeuangan"
	controllersDashboardPasien "BackEnd/Controllers/DashboardPasienControllers"
	controllersLaporan "BackEnd/Controllers/LaporanControllers"
	cors "BackEnd/Middleware"
	"net/http"

	"github.com/gin-gonic/gin"
)

func Setup(
	router *gin.Engine,
	authCtrl *controllers.AuthController,
	adminCtrl *controllers.AdminController,
	dashboardCtrl *controllersDashboardPasien.DashboardController,
	keuanganCtrl *controllersKeuangan.KeuanganController,
	diagnosaCtrl *controllersDashboardPasien.DiagnosaController,
	laporanCtrl *controllersLaporan.LaporanController,
) {
	router.Use(cors.CorsMiddleware())

	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	auth := router.Group("/api/auth")
	{
		auth.POST("/login", authCtrl.Login)
		auth.GET("/me", cors.AuthRequired(), authCtrl.Me)
		auth.GET("/dashboard-keys", cors.AuthRequired(), authCtrl.DashboardKeys)
	}

	admin := router.Group("/api/admin", cors.AuthRequired(), cors.SuperadminRequired())
	{
		admin.GET("/roles", adminCtrl.ListRoles)
		admin.POST("/roles", adminCtrl.CreateRole)
		admin.PUT("/roles/:id", adminCtrl.UpdateRole)
		admin.DELETE("/roles/:id", adminCtrl.DeleteRole)
		admin.GET("/users", adminCtrl.ListUsers)
		admin.POST("/users", adminCtrl.CreateUser)
		admin.PUT("/users/:id", adminCtrl.UpdateUser)
		admin.DELETE("/users/:id", adminCtrl.DeleteUser)
	}

	api := router.Group("/api", cors.AuthRequired())
	{
		pasien := api.Group("/dashboard/pasien")
		{
			pasien.GET("", dashboardCtrl.GetDashboard)
			pasien.GET("/ringkasan", dashboardCtrl.GetRingkasan)
			pasien.GET("/kategori-umur", dashboardCtrl.GetKategoriUmur)
			pasien.GET("/status-perawatan", dashboardCtrl.GetStatusPerawatan)
			pasien.GET("/daftar", dashboardCtrl.GetDaftarPasien)
			pasien.GET("/drilldown", dashboardCtrl.GetDrilldownPasien)
			pasien.GET("/:no_rkm_medis", dashboardCtrl.GetPasienDetail)
		}

		keuangan := api.Group("/dashboard/keuangan")
		{
			keuangan.GET("/ringkasan", keuanganCtrl.GetRingkasan)
			keuangan.GET("/grafik-pemasukan", keuanganCtrl.GetGrafikPemasukan)
			keuangan.GET("/grafik-pengeluaran", keuanganCtrl.GetGrafikPengeluaran)
			keuangan.GET("/keuangan-total", keuanganCtrl.GetKeuanganTotal)
			keuangan.GET("/pemasukan-kategori", keuanganCtrl.GetPemasukanKategori)
			keuangan.GET("/histori", keuanganCtrl.GetHistori)
			keuangan.GET("/histori-pengeluaran", keuanganCtrl.GetHistoriPengeluaran)
			keuangan.GET("/kategori-pengeluaran", keuanganCtrl.GetKategoriPengeluaran)
			keuangan.GET("/pendapatan-akun", keuanganCtrl.GetPendapatanAkun)
			keuangan.GET("/pendapatan-akun/:no_rawat/struk", keuanganCtrl.GetStrukByNoRawat)
			keuangan.GET("/pendapatan-akun/struk", keuanganCtrl.GetStrukByNoRawat)
			keuangan.GET("/ringkasan-pendapatan-laborat", keuanganCtrl.GetRingkasanPendapatanLaborat)
			keuangan.GET("/grafik-pendapatan-laborat", keuanganCtrl.GetGrafikPendapatanLaborat)
		}

		diagnosa := api.Group("/dashboard/diagnosa")
		{
			diagnosa.GET("/terbanyak", diagnosaCtrl.GetDiagnosaTerbanyak)
		}

		laporan := api.Group("/laporan")
		{
			// Keuangan exports
			laporan.GET("/keuangan/csv", laporanCtrl.ExportKeuanganCSV)
			laporan.GET("/keuangan/ringkasan/csv", laporanCtrl.ExportKeuanganSummaryCSV)
			// Pasien exports
			laporan.GET("/pasien/csv", laporanCtrl.ExportPasienCSV)
			laporan.GET("/pasien/ringkasan/csv", laporanCtrl.ExportPasienSummaryCSV)
		}
	}
}
