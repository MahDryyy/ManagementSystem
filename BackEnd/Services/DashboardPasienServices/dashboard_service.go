package services

import (
	ModelsPasien "BackEnd/Models/ModelsPasien"
	repositories "BackEnd/Repositories/DashboardPasien"
)

type DashboardService interface {
	GetDashboard(filter ModelsPasien.PasienFilter) (ModelsPasien.DashboardPasien, error)
	GetRingkasan() (ModelsPasien.DashboardRingkasan, error)
	GetKategoriUmur(periode string) ([]ModelsPasien.KategoriUmurItem, error)
	GetStatusPerawatan() (ModelsPasien.StatusPerawatan, error)
	GetDaftarPasien(filter ModelsPasien.PasienFilter) (ModelsPasien.DaftarPasienResponse, error)
	GetDrilldownPasien(filter ModelsPasien.PasienDrilldownFilter) (ModelsPasien.DaftarPasienResponse, error)
	GetPasienDetail(noRkmMedis string) (ModelsPasien.PasienDetail, error)
}

type dashboardService struct {
	repo repositories.DashboardRepository
}

func NewDashboardService(repo repositories.DashboardRepository) DashboardService {
	return &dashboardService{repo: repo}
}

func (s *dashboardService) GetDashboard(filter ModelsPasien.PasienFilter) (ModelsPasien.DashboardPasien, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	ringkasan, err := s.repo.GetRingkasan()
	if err != nil {
		return ModelsPasien.DashboardPasien{}, err
	}

	kategoriUmur, err := s.repo.GetKategoriUmur(ModelsPasien.PeriodeSemuaWaktu)
	if err != nil {
		return ModelsPasien.DashboardPasien{}, err
	}

	statusPerawatan, err := s.repo.GetStatusPerawatan()
	if err != nil {
		return ModelsPasien.DashboardPasien{}, err
	}

	daftar, _, err := s.repo.GetDaftarPasien(filter)
	if err != nil {
		return ModelsPasien.DashboardPasien{}, err
	}

	return ModelsPasien.DashboardPasien{
		Ringkasan:       ringkasan,
		KategoriUmur:    kategoriUmur,
		StatusPerawatan: statusPerawatan,
		DaftarPasien:    daftar,
	}, nil
}

func (s *dashboardService) GetRingkasan() (ModelsPasien.DashboardRingkasan, error) {
	return s.repo.GetRingkasan()
}

func (s *dashboardService) GetKategoriUmur(periode string) ([]ModelsPasien.KategoriUmurItem, error) {
	return s.repo.GetKategoriUmur(periode)
}

func (s *dashboardService) GetStatusPerawatan() (ModelsPasien.StatusPerawatan, error) {
	return s.repo.GetStatusPerawatan()
}

func (s *dashboardService) GetDaftarPasien(filter ModelsPasien.PasienFilter) (ModelsPasien.DaftarPasienResponse, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	data, total, err := s.repo.GetDaftarPasien(filter)
	if err != nil {
		return ModelsPasien.DaftarPasienResponse{}, err
	}
	return ModelsPasien.DaftarPasienResponse{Data: data, Total: total}, nil
}

func (s *dashboardService) GetDrilldownPasien(filter ModelsPasien.PasienDrilldownFilter) (ModelsPasien.DaftarPasienResponse, error) {
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	data, total, err := s.repo.GetDrilldownPasien(filter)
	if err != nil {
		return ModelsPasien.DaftarPasienResponse{}, err
	}
	return ModelsPasien.DaftarPasienResponse{Data: data, Total: total}, nil
}

func (s *dashboardService) GetPasienDetail(noRkmMedis string) (ModelsPasien.PasienDetail, error) {
	return s.repo.GetPasienDetail(noRkmMedis)
}
