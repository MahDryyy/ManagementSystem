package services

import (
	ModelsAuth "BackEnd/ModelsAuth"
	repositories "BackEnd/Repositories"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

type AdminService interface {
	ListRoles() ([]ModelsAuth.RoleResponse, error)
	CreateRole(req ModelsAuth.CreateRoleRequest) (ModelsAuth.RoleResponse, error)
	UpdateRole(roleID int64, req ModelsAuth.UpdateRoleRequest) (ModelsAuth.RoleResponse, error)
	DeleteRole(roleID int64) error
	ListUsers() ([]ModelsAuth.UserAdminResponse, error)
	CreateUser(req ModelsAuth.CreateUserRequest) (ModelsAuth.UserAdminResponse, error)
	UpdateUser(userID int64, req ModelsAuth.UpdateUserRequest) (ModelsAuth.UserAdminResponse, error)
	DeleteUser(actorUserID, targetUserID int64) error
}

type adminService struct {
	repo repositories.AuthRepository
}

func NewAdminService(repo repositories.AuthRepository) AdminService {
	return &adminService{repo: repo}
}

func (s *adminService) ListRoles() ([]ModelsAuth.RoleResponse, error) {
	return s.repo.ListRoles()
}

func (s *adminService) CreateRole(req ModelsAuth.CreateRoleRequest) (ModelsAuth.RoleResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return ModelsAuth.RoleResponse{}, errors.New("nama role wajib diisi")
	}
	id, err := s.repo.CreateRole(name, req.DashboardKeys)
	if err != nil {
		return ModelsAuth.RoleResponse{}, err
	}
	role, err := s.repo.GetRoleWithPermissions(id)
	if err != nil || role == nil {
		return ModelsAuth.RoleResponse{}, fmt.Errorf("gagal memuat role baru")
	}
	return *role, nil
}

func (s *adminService) UpdateRole(roleID int64, req ModelsAuth.UpdateRoleRequest) (ModelsAuth.RoleResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return ModelsAuth.RoleResponse{}, errors.New("nama role wajib diisi")
	}
	if err := s.repo.UpdateRole(roleID, name, req.DashboardKeys); err != nil {
		return ModelsAuth.RoleResponse{}, err
	}
	role, err := s.repo.GetRoleWithPermissions(roleID)
	if err != nil || role == nil {
		return ModelsAuth.RoleResponse{}, fmt.Errorf("gagal memuat role")
	}
	return *role, nil
}

func (s *adminService) DeleteRole(roleID int64) error {
	return s.repo.DeleteRole(roleID)
}

func (s *adminService) ListUsers() ([]ModelsAuth.UserAdminResponse, error) {
	return s.repo.ListUsers()
}

func (s *adminService) CreateUser(req ModelsAuth.CreateUserRequest) (ModelsAuth.UserAdminResponse, error) {
	username := strings.TrimSpace(req.Username)
	if username == "" {
		return ModelsAuth.UserAdminResponse{}, errors.New("username wajib diisi")
	}
	if len(req.Password) < 6 {
		return ModelsAuth.UserAdminResponse{}, errors.New("password minimal 6 karakter")
	}
	role, err := s.repo.GetRoleByID(req.RoleID)
	if err != nil || role == nil {
		return ModelsAuth.UserAdminResponse{}, errors.New("role tidak ditemukan")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return ModelsAuth.UserAdminResponse{}, err
	}
	id, err := s.repo.CreateUser(username, string(hash), req.RoleID)
	if err != nil {
		return ModelsAuth.UserAdminResponse{}, err
	}
	users, err := s.repo.ListUsers()
	if err != nil {
		return ModelsAuth.UserAdminResponse{}, err
	}
	for _, u := range users {
		if u.ID == id {
			return u, nil
		}
	}
	return ModelsAuth.UserAdminResponse{}, fmt.Errorf("user tidak ditemukan")
}

func (s *adminService) UpdateUser(userID int64, req ModelsAuth.UpdateUserRequest) (ModelsAuth.UserAdminResponse, error) {
	var hash *string
	if req.Password != nil && *req.Password != "" {
		if len(*req.Password) < 6 {
			return ModelsAuth.UserAdminResponse{}, errors.New("password minimal 6 karakter")
		}
		b, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return ModelsAuth.UserAdminResponse{}, err
		}
		s := string(b)
		hash = &s
	}
	if req.RoleID != nil {
		role, err := s.repo.GetRoleByID(*req.RoleID)
		if err != nil || role == nil {
			return ModelsAuth.UserAdminResponse{}, errors.New("role tidak ditemukan")
		}
	}
	if err := s.repo.UpdateUser(userID, hash, req.RoleID, req.IsActive); err != nil {
		return ModelsAuth.UserAdminResponse{}, err
	}
	users, err := s.repo.ListUsers()
	if err != nil {
		return ModelsAuth.UserAdminResponse{}, err
	}
	for _, u := range users {
		if u.ID == userID {
			return u, nil
		}
	}
	return ModelsAuth.UserAdminResponse{}, errors.New("user tidak ditemukan")
}

func (s *adminService) DeleteUser(actorUserID, targetUserID int64) error {
	if actorUserID == targetUserID {
		return errors.New("tidak boleh menghapus akun sendiri")
	}
	u, role, err := s.repo.GetUserWithRole(targetUserID)
	if err != nil {
		return err
	}
	if u == nil {
		return errors.New("user tidak ditemukan")
	}
	if role != nil && role.IsSuperadmin {
		cnt, err := s.repo.CountSuperadminUsers(targetUserID)
		if err != nil {
			return err
		}
		if cnt == 0 {
			return errors.New("tidak boleh menghapus superadmin terakhir yang aktif")
		}
	}
	return s.repo.DeleteUser(targetUserID)
}
