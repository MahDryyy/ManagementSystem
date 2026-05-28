package cors

import (
	"BackEnd/Utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const ContextUserIDKey = "userID"
const ContextClaimsKey = "claims"

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearer(c.GetHeader("Authorization"))
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token tidak ditemukan"})
			return
		}
		claims, err := utils.ParseToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token tidak valid"})
			return
		}
		c.Set(ContextUserIDKey, claims.UserID)
		c.Set(ContextClaimsKey, claims)
		c.Next()
	}
}

func SuperadminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		v, ok := c.Get(ContextClaimsKey)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "belum login"})
			return
		}
		claims, ok := v.(*utils.JWTClaims)
		if !ok || !claims.IsSuperadmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "hanya superadmin"})
			return
		}
		c.Next()
	}
}

func extractBearer(header string) string {
	if header == "" {
		return ""
	}
	const prefix = "Bearer "
	if strings.HasPrefix(header, prefix) {
		return strings.TrimSpace(header[len(prefix):])
	}
	return strings.TrimSpace(header)
}

func GetUserID(c *gin.Context) int64 {
	v, _ := c.Get(ContextUserIDKey)
	id, _ := v.(int64)
	return id
}
