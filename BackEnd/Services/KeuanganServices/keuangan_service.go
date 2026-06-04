package services

import (
	ModelsKeuangan "BackEnd/Models/ModelsKeuangan"
	repositories "BackEnd/Repositories/DashboardKeuangan"
)

type KeuanganService interface {
	GetPendapatanPerAkun(filter ModelsKeuangan.PendapatanAkunFilter) (ModelsKeuangan.PendapatanAkunResponse, error)
	GetStrukByNoRawat(noRawat string) (ModelsKeuangan.StrukResponse, error)
	GetRingkasanPemasukan() (ModelsKeuangan.RingkasanPemasukan, error)
	GetGrafikPemasukan(granularity string) ([]ModelsKeuangan.GrafikTitik, error)
	GetGrafikPengeluaran(granularity string) ([]ModelsKeuangan.GrafikTitik, error)
	GetKeuanganTotal(periode string) ([]ModelsKeuangan.KeuanganTotalTitik, error)
	GetPemasukanPerKategori(periode string) ([]ModelsKeuangan.PemasukanKategoriItem, error)
	GetHistori(limit, offset int) (ModelsKeuangan.HistoriResponse, error)
	GetHistoriPengeluaran(filter ModelsKeuangan.HistoriPengeluaranFilter) (ModelsKeuangan.HistoriPengeluaranResponse, error)
	GetKategoriPengeluaran() ([]ModelsKeuangan.KategoriPengeluaranItem, error)
	GetRingkasanPendapatanLaborat() (ModelsKeuangan.RingkasanPendapatanLaborat, error)
	GetGrafikPendapatanLaborat(periode string) ([]ModelsKeuangan.GrafikTitik, error)
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

func (s *keuanganService) GetStrukByNoRawat(noRawat string) (ModelsKeuangan.StrukResponse, error) {
	return s.repo.GetStrukByNoRawat(noRawat)
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

func (s *keuanganService) GetHistoriPengeluaran(filter ModelsKeuangan.HistoriPengeluaranFilter) (ModelsKeuangan.HistoriPengeluaranResponse, error) {
	return s.repo.GetHistoriPengeluaran(filter)
}

func (s *keuanganService) GetKategoriPengeluaran() ([]ModelsKeuangan.KategoriPengeluaranItem, error) {
	return s.repo.GetKategoriPengeluaran()
}

func (s *keuanganService) GetRingkasanPendapatanLaborat() (ModelsKeuangan.RingkasanPendapatanLaborat, error) {
	return s.repo.GetRingkasanPendapatanLaborat()
}

func (s *keuanganService) GetGrafikPendapatanLaborat(periode string) ([]ModelsKeuangan.GrafikTitik, error) {
	return s.repo.GetGrafikPendapatanLaborat(periode)
}
