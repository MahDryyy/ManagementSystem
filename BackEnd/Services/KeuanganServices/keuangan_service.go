package services

import (
	ModelsKeuangan "BackEnd/Models/ModelsKeuangan"
	repositories "BackEnd/Repositories/DashboardKeuangan"
)

type KeuanganService interface {
	GetPendapatanPerAkun(filter ModelsKeuangan.PendapatanAkunFilter) (ModelsKeuangan.PendapatanAkunResponse, error)
	GetRingkasanPemasukan() (ModelsKeuangan.RingkasanPemasukan, error)
	GetGrafikPemasukan(granularity string) ([]ModelsKeuangan.GrafikTitik, error)
	GetGrafikPengeluaran(granularity string) ([]ModelsKeuangan.GrafikTitik, error)
	GetKeuanganTotal(periode string) ([]ModelsKeuangan.KeuanganTotalTitik, error)
	GetPemasukanPerKategori(periode string) ([]ModelsKeuangan.PemasukanKategoriItem, error)
	GetHistori(limit, offset int) (ModelsKeuangan.HistoriResponse, error)
}

type keuanganService struct {
	repo repositories.KeuanganRepository
}

func NewKeuanganService(repo repositories.KeuanganRepository) KeuanganService {
	return &keuanganService{repo: repo}
}

func (s *keuanganService) GetPendapatanPerAkun(filter ModelsKeuangan.PendapatanAkunFilter) (ModelsKeuangan.PendapatanAkunResponse, error) {
	return s.repo.GetPendapatanPerAkun(filter)
}

func (s *keuanganService) GetRingkasanPemasukan() (ModelsKeuangan.RingkasanPemasukan, error) {
	return s.repo.GetRingkasanPemasukan()
}

func (s *keuanganService) GetGrafikPemasukan(granularity string) ([]ModelsKeuangan.GrafikTitik, error) {
	return s.repo.GetGrafikPemasukan(granularity)
}

func (s *keuanganService) GetGrafikPengeluaran(granularity string) ([]ModelsKeuangan.GrafikTitik, error) {
	return s.repo.GetGrafikPengeluaran(granularity)
}

func (s *keuanganService) GetKeuanganTotal(periode string) ([]ModelsKeuangan.KeuanganTotalTitik, error) {
	return s.repo.GetKeuanganTotal(periode)
}

func (s *keuanganService) GetPemasukanPerKategori(periode string) ([]ModelsKeuangan.PemasukanKategoriItem, error) {
	return s.repo.GetPemasukanPerKategori(periode)
}

func (s *keuanganService) GetHistori(limit, offset int) (ModelsKeuangan.HistoriResponse, error) {
	return s.repo.GetHistori(limit, offset)
}
