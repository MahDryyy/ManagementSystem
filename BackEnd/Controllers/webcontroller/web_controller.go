package webcontroller

import (
	"net/http"

	website "BackEnd/Services/website"

	"github.com/gin-gonic/gin"
)

type WebController struct {
	service *website.WebService
}

func NewWebController(service *website.WebService) *WebController {
	return &WebController{
		service: service,
	}
}

func (c *WebController) GetSosmedStat(ctx *gin.Context) {
	data, err := c.service.GetSosmedStat()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, data)
}

func (c *WebController) GetSosmedEngagement(ctx *gin.Context) {
	data, err := c.service.GetSosmedEngagement()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, data)
}

func (c *WebController) GetReview(ctx *gin.Context) {
	data, err := c.service.GetReview()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, data)
}

func (c *WebController) GetWebVisitor(ctx *gin.Context) {
	data, err := c.service.GetWebVisitor()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, data)
}

func (c *WebController) GetWebSocialClick(ctx *gin.Context) {
	data, err := c.service.GetWebSocialClick()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, data)
}

func (c *WebController) GetWebVisitorSesion(ctx *gin.Context) {
	data, err := c.service.GetWebVisitorSesion()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, data)
}

func (c *WebController) GetTiktokStat(ctx *gin.Context) {
	data, err := c.service.GetTiktokStat()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, data)
}

func (c *WebController) GetTiktokHitStat(ctx *gin.Context) {
	data, err := c.service.GetTiktokHitStat()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, data)
}
