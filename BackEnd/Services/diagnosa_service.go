package services

import (
	ModelsPasien "BackEnd/Models"
	repositories "BackEnd/Repositories"
)

type DiagnosaService interface {
	GetDiagnosaTerbanyak(filter ModelsPasien.DiagnosaTerbanyakFilter) (ModelsPasien.DiagnosaTerbanyakResponse, error)
}

type diagnosaService struct {
	repo repositories.DiagnosaRepository
}

func NewDiagnosaService(repo repositories.DiagnosaRepository) DiagnosaService {
	return &diagnosaService{repo: repo}
}

func (s *diagnosaService) GetDiagnosaTerbanyak(filter ModelsPasien.DiagnosaTerbanyakFilter) (ModelsPasien.DiagnosaTerbanyakResponse, error) {
	if filter.Limit <= 0 {
		filter.Limit = 10
	}
	if filter.Periode == "" {
		filter.Periode = ModelsPasien.PeriodeSemuaWaktu
	}

	periode, err := repositories.ResolvePeriode(filter.Periode)
	if err != nil {
		return ModelsPasien.DiagnosaTerbanyakResponse{}, err
	}
	filter.Periode = periode

	data, total, err := s.repo.GetDiagnosaTerbanyak(filter)
	if err != nil {
		return ModelsPasien.DiagnosaTerbanyakResponse{}, err
	}

	return ModelsPasien.DiagnosaTerbanyakResponse{
		Periode: periode,
		Total:   total,
		Data:    data,
	}, nil
}
