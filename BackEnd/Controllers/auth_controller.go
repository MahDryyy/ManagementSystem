package controllers

import (
	cors "BackEnd/Middleware"
	ModelsAuth "BackEnd/Models/ModelsAuth"
	"BackEnd/Services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	svc services.AuthService
}

func NewAuthController(svc services.AuthService) *AuthController {
	return &AuthController{svc: svc}
}

func (ctrl *AuthController) Login(c *gin.Context) {
	var req ModelsAuth.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username dan password wajib diisi"})
		return
	}
	data, err := ctrl.svc.Login(req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *AuthController) Me(c *gin.Context) {
	userID := cors.GetUserID(c)
	data, err := ctrl.svc.Me(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (ctrl *AuthController) DashboardKeys(c *gin.Context) {
	c.JSON(http.StatusOK, ctrl.svc.DashboardKeyCatalog())
}
