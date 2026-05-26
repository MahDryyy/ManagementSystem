package main

import (
	"fmt"
	"log"
	"os"

	"BackEnd/Controllers"
	db "BackEnd/Database"
	"BackEnd/Repositories"
	"BackEnd/Routes"
	"BackEnd/Services"

	"github.com/gin-gonic/gin"
)

func main() {
	database, err := db.ConnectDB()
	if err != nil {
		log.Fatalf("Database error: %v", err)
	}
	defer database.Close()

	dashboardRepo := repositories.NewDashboardRepository(database)
	dashboardSvc := services.NewDashboardService(dashboardRepo)
	dashboardCtrl := controllers.NewDashboardController(dashboardSvc)

	diagnosaRepo := repositories.NewDiagnosaRepository(database)
	diagnosaSvc := services.NewDiagnosaService(diagnosaRepo)
	diagnosaCtrl := controllers.NewDiagnosaController(diagnosaSvc)

	router := gin.Default()
	routes.Setup(router, dashboardCtrl, diagnosaCtrl)

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
