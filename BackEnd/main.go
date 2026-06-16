package main

import (
	"fmt"
	"log"
	"os"

	controllers "BackEnd/Controllers"
	controllersKeuangan "BackEnd/Controllers/DashboardKeuangan"
	controllersDashboardPasien "BackEnd/Controllers/DashboardPasienControllers"
	controllersLaporan "BackEnd/Controllers/LaporanControllers"
	db "BackEnd/Database"
	repositories "BackEnd/Repositories"
	repositoriesDashboardKeuangan "BackEnd/Repositories/DashboardKeuangan"
	repositoriesDashboardPasien "BackEnd/Repositories/DashboardPasien"
	routes "BackEnd/Routes"
	services "BackEnd/Services"
	servicesDashboardPasien "BackEnd/Services/DashboardPasienServices"
	servicesKeuangan "BackEnd/Services/KeuanganServices"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	fmt.Println("Starting server...")
	database, err := db.ConnectDB()
	if err != nil {
		log.Fatalf("Database error: %v", err)
	}
	defer database.Close()

	authRepo := repositories.NewAuthRepository(database)
	authSvc := services.NewAuthService(authRepo)
	authCtrl := controllers.NewAuthController(authSvc)

	adminSvc := services.NewAdminService(authRepo)
	adminCtrl := controllers.NewAdminController(adminSvc)

	dashboardRepo := repositoriesDashboardPasien.NewDashboardRepository(database)
	dashboardSvc := servicesDashboardPasien.NewDashboardService(dashboardRepo)
	dashboardCtrl := controllersDashboardPasien.NewDashboardController(dashboardSvc)

	keuanganRepo := repositoriesDashboardKeuangan.NewKeuanganRepository(database)
	keuanganSvc := servicesKeuangan.NewKeuanganService(keuanganRepo)
	keuanganCtrl := controllersKeuangan.NewKeuanganController(keuanganSvc)

	diagnosaRepo := repositoriesDashboardPasien.NewDiagnosaRepository(database)
	diagnosaSvc := servicesDashboardPasien.NewDiagnosaService(diagnosaRepo)
	diagnosaCtrl := controllersDashboardPasien.NewDiagnosaController(diagnosaSvc)

	laporanCtrl := controllersLaporan.NewLaporanController(keuanganSvc, dashboardSvc)

	router := gin.Default()
	routes.Setup(router, authCtrl, adminCtrl, dashboardCtrl, keuanganCtrl, diagnosaCtrl, laporanCtrl)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("Server berjalan di http://localhost%s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
