package repositories

import (
	ModelsAuth "BackEnd/Models/ModelsAuth"
	"database/sql"
	"fmt"
	"strings"
)

type AuthRepository interface {
	FindUserByUsername(username string) (*ModelsAuth.User, error)
	GetUserByID(userID int64) (*ModelsAuth.User, error)
	GetUserWithRole(userID int64) (*ModelsAuth.User, *ModelsAuth.Role, error)
	GetRoleByID(roleID int64) (*ModelsAuth.Role, error)
	GetDashboardKeysForRole(roleID int64, isSuperadmin bool) ([]string, error)
	ListRoles() ([]ModelsAuth.RoleResponse, error)
	GetRoleWithPermissions(roleID int64) (*ModelsAuth.RoleResponse, error)
	CreateRole(name string, keys []string) (int64, error)
	UpdateRole(roleID int64, name string, keys []string) error
	DeleteRole(roleID int64) error
	RoleUserCount(roleID int64) (int, error)
	IsSuperadminRole(roleID int64) (bool, error)
	ListUsers() ([]ModelsAuth.UserAdminResponse, error)
	CreateUser(username, passwordHash string, roleID int64) (int64, error)
	UpdateUser(userID int64, passwordHash *string, roleID *int64, isActive *bool) error
	DeleteUser(userID int64) error
	CountSuperadminUsers(excludeUserID int64) (int, error)
}

type authRepository struct {
	db *sql.DB
}

func NewAuthRepository(db *sql.DB) AuthRepository {
	return &authRepository{db: db}
}

func (r *authRepository) FindUserByUsername(username string) (*ModelsAuth.User, error) {
	var u ModelsAuth.User
	err := r.db.QueryRow(`
		SELECT id, username, password_hash, role_id, is_active
		FROM users
		WHERE username = ?
	`, username).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.RoleID, &u.IsActive)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *authRepository) GetUserByID(userID int64) (*ModelsAuth.User, error) {
	var u ModelsAuth.User
	err := r.db.QueryRow(`
		SELECT id, username, password_hash, role_id, is_active
		FROM users WHERE id = ?
	`, userID).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.RoleID, &u.IsActive)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *authRepository) GetUserWithRole(userID int64) (*ModelsAuth.User, *ModelsAuth.Role, error) {
	u, err := r.GetUserByID(userID)
	if err != nil || u == nil {
		return u, nil, err
	}
	role, err := r.GetRoleByID(u.RoleID)
	if err != nil {
		return nil, nil, err
	}
	return u, role, nil
}

func (r *authRepository) GetRoleByID(roleID int64) (*ModelsAuth.Role, error) {
	var role ModelsAuth.Role
	err := r.db.QueryRow(`
		SELECT id, name, is_superadmin FROM roles WHERE id = ?
	`, roleID).Scan(&role.ID, &role.Name, &role.IsSuperadmin)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *authRepository) GetDashboardKeysForRole(roleID int64, isSuperadmin bool) ([]string, error) {
	if isSuperadmin {
		return append([]string{}, ModelsAuth.AllDashboardKeys...), nil
	}
	rows, err := r.db.Query(`
		SELECT permission_key FROM role_permissions WHERE role_id = ? ORDER BY permission_key
	`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []string
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	if keys == nil {
		keys = []string{}
	}
	return keys, rows.Err()
}

func (r *authRepository) ListRoles() ([]ModelsAuth.RoleResponse, error) {
	rows, err := r.db.Query(`
		SELECT r.id, r.name, r.is_superadmin,
			(SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) AS user_count
		FROM roles r
		ORDER BY r.is_superadmin DESC, r.name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ModelsAuth.RoleResponse
	for rows.Next() {
		var item ModelsAuth.RoleResponse
		if err := rows.Scan(&item.ID, &item.Name, &item.IsSuperadmin, &item.UserCount); err != nil {
			return nil, err
		}
		item.DashboardKeys, err = r.GetDashboardKeysForRole(item.ID, item.IsSuperadmin)
		if err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	if list == nil {
		list = []ModelsAuth.RoleResponse{}
	}
	return list, rows.Err()
}

func (r *authRepository) GetRoleWithPermissions(roleID int64) (*ModelsAuth.RoleResponse, error) {
	role, err := r.GetRoleByID(roleID)
	if err != nil || role == nil {
		return nil, err
	}
	keys, err := r.GetDashboardKeysForRole(roleID, role.IsSuperadmin)
	if err != nil {
		return nil, err
	}
	cnt, _ := r.RoleUserCount(roleID)
	return &ModelsAuth.RoleResponse{
		ID:            role.ID,
		Name:          role.Name,
		IsSuperadmin:  role.IsSuperadmin,
		DashboardKeys: keys,
		UserCount:     cnt,
	}, nil
}

func (r *authRepository) CreateRole(name string, keys []string) (int64, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	res, err := tx.Exec(`INSERT INTO roles (name, is_superadmin) VALUES (?, FALSE)`, name)
	if err != nil {
		return 0, err
	}
	roleID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	if err := insertRolePermissions(tx, roleID, keys); err != nil {
		return 0, err
	}
	return roleID, tx.Commit()
}

func (r *authRepository) UpdateRole(roleID int64, name string, keys []string) error {
	isSuper, err := r.IsSuperadminRole(roleID)
	if err != nil {
		return err
	}
	if isSuper {
		_, err := r.db.Exec(`UPDATE roles SET name = ? WHERE id = ?`, name, roleID)
		return err
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE roles SET name = ? WHERE id = ?`, name, roleID); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM role_permissions WHERE role_id = ?`, roleID); err != nil {
		return err
	}
	if err := insertRolePermissions(tx, roleID, keys); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *authRepository) DeleteRole(roleID int64) error {
	isSuper, err := r.IsSuperadminRole(roleID)
	if err != nil {
		return err
	}
	if isSuper {
		return fmt.Errorf("role superadmin tidak boleh dihapus")
	}
	cnt, err := r.RoleUserCount(roleID)
	if err != nil {
		return err
	}
	if cnt > 0 {
		return fmt.Errorf("role masih dipakai %d user", cnt)
	}
	_, err = r.db.Exec(`DELETE FROM roles WHERE id = ?`, roleID)
	return err
}

func (r *authRepository) RoleUserCount(roleID int64) (int, error) {
	var n int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM users WHERE role_id = ?`, roleID).Scan(&n)
	return n, err
}

func (r *authRepository) IsSuperadminRole(roleID int64) (bool, error) {
	var v bool
	err := r.db.QueryRow(`SELECT is_superadmin FROM roles WHERE id = ?`, roleID).Scan(&v)
	return v, err
}

func (r *authRepository) ListUsers() ([]ModelsAuth.UserAdminResponse, error) {
	rows, err := r.db.Query(`
		SELECT u.id, u.username, u.role_id, r.name, u.is_active
		FROM users u
		INNER JOIN roles r ON u.role_id = r.id
		ORDER BY u.username ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ModelsAuth.UserAdminResponse
	for rows.Next() {
		var item ModelsAuth.UserAdminResponse
		if err := rows.Scan(&item.ID, &item.Username, &item.RoleID, &item.RoleName, &item.IsActive); err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	if list == nil {
		list = []ModelsAuth.UserAdminResponse{}
	}
	return list, rows.Err()
}

func (r *authRepository) CreateUser(username, passwordHash string, roleID int64) (int64, error) {
	res, err := r.db.Exec(`
		INSERT INTO users (username, password_hash, role_id, is_active)
		VALUES (?, ?, ?, TRUE)
	`, username, passwordHash, roleID)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *authRepository) UpdateUser(userID int64, passwordHash *string, roleID *int64, isActive *bool) error {
	if passwordHash != nil {
		if _, err := r.db.Exec(`UPDATE users SET password_hash = ? WHERE id = ?`, *passwordHash, userID); err != nil {
			return err
		}
	}
	if roleID != nil {
		if _, err := r.db.Exec(`UPDATE users SET role_id = ? WHERE id = ?`, *roleID, userID); err != nil {
			return err
		}
	}
	if isActive != nil {
		if _, err := r.db.Exec(`UPDATE users SET is_active = ? WHERE id = ?`, *isActive, userID); err != nil {
			return err
		}
	}
	return nil
}

func (r *authRepository) DeleteUser(userID int64) error {
	_, err := r.db.Exec(`DELETE FROM users WHERE id = ?`, userID)
	return err
}

func (r *authRepository) CountSuperadminUsers(excludeUserID int64) (int, error) {
	var n int
	err := r.db.QueryRow(`
		SELECT COUNT(*)
		FROM users u
		INNER JOIN roles r ON u.role_id = r.id
		WHERE r.is_superadmin = TRUE AND u.is_active = TRUE AND u.id <> ?
	`, excludeUserID).Scan(&n)
	return n, err
}

func insertRolePermissions(tx *sql.Tx, roleID int64, keys []string) error {
	valid := make(map[string]bool)
	for _, k := range ModelsAuth.AllDashboardKeys {
		valid[k] = true
	}
	seen := make(map[string]bool)
	for _, k := range keys {
		k = strings.TrimSpace(k)
		if k == "" || !valid[k] || seen[k] {
			continue
		}
		seen[k] = true
		if _, err := tx.Exec(`
			INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)
		`, roleID, k); err != nil {
			return err
		}
	}
	return nil
}
