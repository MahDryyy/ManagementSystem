package services

import (
	ModelsAuth "BackEnd/ModelsAuth"
	repositories "BackEnd/Repositories"
	utils "BackEnd/Utils"
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Login(req ModelsAuth.LoginRequest) (ModelsAuth.LoginResponse, error)
	Me(userID int64) (ModelsAuth.UserResponse, error)
	DashboardKeyCatalog() []ModelsAuth.DashboardKeyItem
}

type authService struct {
	repo repositories.AuthRepository
}

func NewAuthService(repo repositories.AuthRepository) AuthService {
	return &authService{repo: repo}
}

func (s *authService) Login(req ModelsAuth.LoginRequest) (ModelsAuth.LoginResponse, error) {
	u, err := s.repo.FindUserByUsername(req.Username)
	if err != nil {
		return ModelsAuth.LoginResponse{}, err
	}
	if u == nil || !u.IsActive {
		return ModelsAuth.LoginResponse{}, errors.New("username atau password salah")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		return ModelsAuth.LoginResponse{}, errors.New("username atau password salah")
	}

	role, err := s.repo.GetRoleByID(u.RoleID)
	if err != nil || role == nil {
		return ModelsAuth.LoginResponse{}, fmt.Errorf("role tidak ditemukan")
	}

	userResp, err := s.buildUserResponse(u, role)
	if err != nil {
		return ModelsAuth.LoginResponse{}, err
	}

	token, err := utils.IssueToken(u.ID, u.RoleID, u.Username, role.IsSuperadmin)
	if err != nil {
		return ModelsAuth.LoginResponse{}, err
	}

	return ModelsAuth.LoginResponse{Token: token, User: userResp}, nil
}

func (s *authService) Me(userID int64) (ModelsAuth.UserResponse, error) {
	u, role, err := s.repo.GetUserWithRole(userID)
	if err != nil {
		return ModelsAuth.UserResponse{}, err
	}
	if u == nil || !u.IsActive {
		return ModelsAuth.UserResponse{}, errors.New("user tidak ditemukan")
	}
	if role == nil {
		return ModelsAuth.UserResponse{}, errors.New("role tidak ditemukan")
	}
	return s.buildUserResponse(u, role)
}

func (s *authService) buildUserResponse(u *ModelsAuth.User, role *ModelsAuth.Role) (ModelsAuth.UserResponse, error) {
	keys, err := s.repo.GetDashboardKeysForRole(role.ID, role.IsSuperadmin)
	if err != nil {
		return ModelsAuth.UserResponse{}, err
	}
	return ModelsAuth.UserResponse{
		ID:            u.ID,
		Username:      u.Username,
		RoleID:        u.RoleID,
		RoleName:      role.Name,
		IsSuperadmin:  role.IsSuperadmin,
		IsActive:      u.IsActive,
		DashboardKeys: keys,
	}, nil
}

func (s *authService) DashboardKeyCatalog() []ModelsAuth.DashboardKeyItem {
	labels := map[string]string{
		ModelsAuth.DashboardKeyDashboard:         "Dashboard",
		ModelsAuth.DashboardKeyDashboardPasien:   "Dashboard Pasien",
		ModelsAuth.DashboardKeyDashboardObat:     "Dashboard Obat",
		ModelsAuth.DashboardKeyDashboardWebsite:  "Dashboard Website",
		ModelsAuth.DashboardKeyDashboardLaporan:  "Dashboard Laporan",
		ModelsAuth.DashboardKeyDashboardKeuangan: "Dashboard Keuangan",
		ModelsAuth.DashboardKeySettings:          "Settings",
	}
	out := make([]ModelsAuth.DashboardKeyItem, 0, len(ModelsAuth.AllDashboardKeys))
	for _, k := range ModelsAuth.AllDashboardKeys {
		out = append(out, ModelsAuth.DashboardKeyItem{Key: k, Label: labels[k]})
	}
	return out
}
