package main

import (
	"fmt"
	"log"
	"os"

	controllers "BackEnd/Controllers"
	db "BackEnd/Database"
	repositories "BackEnd/Repositories"
	routes "BackEnd/Routes"
	services "BackEnd/Services"

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

	dashboardRepo := repositories.NewDashboardRepository(database)
	dashboardSvc := services.NewDashboardService(dashboardRepo)
	dashboardCtrl := controllers.NewDashboardController(dashboardSvc)

	diagnosaRepo := repositories.NewDiagnosaRepository(database)
	diagnosaSvc := services.NewDiagnosaService(diagnosaRepo)
	diagnosaCtrl := controllers.NewDiagnosaController(diagnosaSvc)

	router := gin.Default()
	routes.Setup(router, authCtrl, adminCtrl, dashboardCtrl, diagnosaCtrl)

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
