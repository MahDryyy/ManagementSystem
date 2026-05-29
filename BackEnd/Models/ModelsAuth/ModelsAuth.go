package ModelsAuth

import "time"

const (
	DashboardKeyDashboard         = "dashboard"
	DashboardKeyDashboardPasien   = "dashboard-pasien"
	DashboardKeyDashboardObat     = "dashboard-obat"
	DashboardKeyDashboardWebsite  = "dashboard-website"
	DashboardKeyDashboardLaporan  = "dashboard-laporan"
	DashboardKeyDashboardKeuangan = "dashboard-keuangan"
	DashboardKeySettings          = "settings"
)

var AllDashboardKeys = []string{
	DashboardKeyDashboard,
	DashboardKeyDashboardPasien,
	DashboardKeyDashboardObat,
	DashboardKeyDashboardWebsite,
	DashboardKeyDashboardLaporan,
	DashboardKeyDashboardKeuangan,
	DashboardKeySettings,
}

type Role struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	IsSuperadmin bool      `json:"is_superadmin"`
	CreatedAt    time.Time `json:"created_at,omitempty"`
	UpdatedAt    time.Time `json:"updated_at,omitempty"`
}

type User struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	RoleID       int64     `json:"role_id"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at,omitempty"`
	UpdatedAt    time.Time `json:"updated_at,omitempty"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	ID            int64    `json:"id"`
	Username      string   `json:"username"`
	RoleID        int64    `json:"role_id"`
	RoleName      string   `json:"role_name"`
	IsSuperadmin  bool     `json:"is_superadmin"`
	IsActive      bool     `json:"is_active"`
	DashboardKeys []string `json:"dashboard_keys"`
}

type RoleResponse struct {
	ID            int64    `json:"id"`
	Name          string   `json:"name"`
	IsSuperadmin  bool     `json:"is_superadmin"`
	DashboardKeys []string `json:"dashboard_keys"`
	UserCount     int      `json:"user_count,omitempty"`
}

type CreateRoleRequest struct {
	Name          string   `json:"name" binding:"required"`
	DashboardKeys []string `json:"dashboard_keys"`
}

type UpdateRoleRequest struct {
	Name          string   `json:"name" binding:"required"`
	DashboardKeys []string `json:"dashboard_keys"`
}

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	RoleID   int64  `json:"role_id" binding:"required"`
}

type UpdateUserRequest struct {
	Password *string `json:"password"`
	RoleID   *int64  `json:"role_id"`
	IsActive *bool   `json:"is_active"`
}

type UserAdminResponse struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	RoleID   int64  `json:"role_id"`
	RoleName string `json:"role_name"`
	IsActive bool   `json:"is_active"`
}

type DashboardKeyItem struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}
