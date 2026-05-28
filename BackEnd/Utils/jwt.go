package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID       int64  `json:"user_id"`
	Username     string `json:"username"`
	RoleID       int64  `json:"role_id"`
	IsSuperadmin bool   `json:"is_superadmin"`
	jwt.RegisteredClaims
}

func jwtSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "management-system-dev-secret-change-in-production"
	}
	return []byte(s)
}

func IssueToken(userID, roleID int64, username string, isSuperadmin bool) (string, error) {
	claims := JWTClaims{
		UserID:       userID,
		Username:     username,
		RoleID:       roleID,
		IsSuperadmin: isSuperadmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(jwtSecret())
}

func ParseToken(tokenStr string) (*JWTClaims, error) {
	t, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("metode token tidak valid")
		}
		return jwtSecret(), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := t.Claims.(*JWTClaims)
	if !ok || !t.Valid {
		return nil, errors.New("token tidak valid")
	}
	return claims, nil
}
