package services

import (
	ModelsObat "BackEnd/Models/ModelsObat"
	repositories "BackEnd/Repositories/DashboardObat"
)

type DashboardObatService interface {
	GetDashboard(key ModelsObat.DashboardCacheKey) (ModelsObat.DashboardResponse, error)
}

type dashboardObatService struct {
	repo repositories.DashboardObatRepository
}

func NewDashboardObatService(repo repositories.DashboardObatRepository) DashboardObatService {
	return &dashboardObatService{repo: repo}
}

func (s *dashboardObatService) GetDashboard(key ModelsObat.DashboardCacheKey) (ModelsObat.DashboardResponse, error) {
	return s.repo.GetDashboard(key)
}
