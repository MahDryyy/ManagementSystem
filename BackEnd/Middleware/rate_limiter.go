package middleware

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

var visitors = make(map[string]*rate.Limiter)
var mu sync.Mutex

func getVisitor(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	limiter, exists := visitors[ip]
	if !exists {
		// 5 request/detik
		// burst maksimal 20 request
		limiter = rate.NewLimiter(5, 20)
		visitors[ip] = limiter
	}

	return limiter
}

func RateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {

		ip := c.ClientIP()

		limiter := getVisitor(ip)

		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "Terlalu banyak request. lebih bersabar, silakan coba lagi.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
