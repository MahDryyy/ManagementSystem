package services

import (
	"BackEnd/Models"
	"BackEnd/Repositories"
)

type DashboardService interface {
	GetDashboard(filter Models.PasienFilter) (Models.DashboardPasien, error)
	GetRingkasan() (Models.DashboardRingkasan, error)
	GetKategoriUmur() ([]Models.KategoriUmurItem, error)
	GetStatusPerawatan() (Models.StatusPerawatan, error)
	GetDaftarPasien(filter Models.PasienFilter) (Models.DaftarPasienResponse, error)
}

type dashboardService struct {
	repo repositories.DashboardRepository
}

func NewDashboardService(repo repositories.DashboardRepository) DashboardService {
	return &dashboardService{repo: repo}
}

func (s *dashboardService) GetDashboard(filter Models.PasienFilter) (Models.DashboardPasien, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	ringkasan, err := s.repo.GetRingkasan()
	if err != nil {
		return Models.DashboardPasien{}, err
	}

	kategoriUmur, err := s.repo.GetKategoriUmur()
	if err != nil {
		return Models.DashboardPasien{}, err
	}

	statusPerawatan, err := s.repo.GetStatusPerawatan()
	if err != nil {
		return Models.DashboardPasien{}, err
	}

	daftar, _, err := s.repo.GetDaftarPasien(filter)
	if err != nil {
		return Models.DashboardPasien{}, err
	}

	return Models.DashboardPasien{
		Ringkasan:       ringkasan,
		KategoriUmur:    kategoriUmur,
		StatusPerawatan: statusPerawatan,
		DaftarPasien:    daftar,
	}, nil
}

func (s *dashboardService) GetRingkasan() (Models.DashboardRingkasan, error) {
	return s.repo.GetRingkasan()
}

func (s *dashboardService) GetKategoriUmur() ([]Models.KategoriUmurItem, error) {
	return s.repo.GetKategoriUmur()
}

func (s *dashboardService) GetStatusPerawatan() (Models.StatusPerawatan, error) {
	return s.repo.GetStatusPerawatan()
}

func (s *dashboardService) GetDaftarPasien(filter Models.PasienFilter) (Models.DaftarPasienResponse, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	data, total, err := s.repo.GetDaftarPasien(filter)
	if err != nil {
		return Models.DaftarPasienResponse{}, err
	}
	return Models.DaftarPasienResponse{Data: data, Total: total}, nil
}
