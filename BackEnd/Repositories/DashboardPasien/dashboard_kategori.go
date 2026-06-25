package repositories

import (
	ModelsPasien "BackEnd/Models/ModelsPasien"
	"fmt"
)

func kategoriUmurDisplayOrder() []string {
	return []string{
		ModelsPasien.KategoriIbuHamil,
		ModelsPasien.KategoriIbuBersalin,
		ModelsPasien.KategoriUmurBayiBaruLahir,
		ModelsPasien.KategoriUmurBalita,
		ModelsPasien.KategoriUmurPendidikan,
		ModelsPasien.KategoriUmurProduktif,
		ModelsPasien.KategoriUmurLanjut,
		ModelsPasien.KategoriDM,
		ModelsPasien.KategoriHT,
	}
}

func isKategoriKhusus(kategori string) bool {
	switch kategori {
	case ModelsPasien.KategoriIbuHamil,
		ModelsPasien.KategoriIbuBersalin,
		ModelsPasien.KategoriDM,
		ModelsPasien.KategoriHT:
		return true
	default:
		return false
	}
}

func kategoriKhususCondition(kategori string) (string, error) {
	switch kategori {
	case ModelsPasien.KategoriIbuHamil:
		return `(
			rp.kd_poli IN ('KB', 'BPJS2')
			OR EXISTS (
				SELECT 1 FROM diagnosa_pasien dp
				INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
				WHERE dp.no_rawat = rp.no_rawat
				AND (
					dp.kd_penyakit REGEXP '^O0[0-9]|^O1[0-9]|^O2[0-9]|^O3[0-9]|^O4[0-8]'
					OR dp.kd_penyakit LIKE 'Z34%'
					OR dp.kd_penyakit LIKE 'Z33%'
					OR LOWER(peny.nm_penyakit) LIKE '%hamil%'
				)
			)
		)`, nil
	case ModelsPasien.KategoriIbuBersalin:
		return `(
			rp.kd_poli = 'BPJS4'
			OR EXISTS (
				SELECT 1 FROM diagnosa_pasien dp
				INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
				WHERE dp.no_rawat = rp.no_rawat
				AND (
					dp.kd_penyakit REGEXP '^O8[0-4]|^O9[0-2]'
					OR LOWER(peny.nm_penyakit) LIKE '%persalinan%'
					OR LOWER(peny.nm_penyakit) LIKE '%bersalin%'
				)
			)
		)`, nil
	case ModelsPasien.KategoriDM:
		return `EXISTS (
			SELECT 1 FROM diagnosa_pasien dp
			INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
			WHERE dp.no_rawat = rp.no_rawat
			AND (
				dp.kd_penyakit REGEXP '^E1[0-4]'
				OR LOWER(peny.nm_penyakit) LIKE '%diabetes%'
			)
		)`, nil
	case ModelsPasien.KategoriHT:
		return `EXISTS (
			SELECT 1 FROM diagnosa_pasien dp
			INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
			WHERE dp.no_rawat = rp.no_rawat
			AND (
				dp.kd_penyakit REGEXP '^I1[0-5]'
				OR LOWER(peny.nm_penyakit) LIKE '%hipertensi%'
			)
		)`, nil
	default:
		return "", fmt.Errorf("kategori khusus tidak dikenal: %s", kategori)
	}
}

func buildKategoriUmurResult(counts map[string]int) []ModelsPasien.KategoriUmurItem {
	result := make([]ModelsPasien.KategoriUmurItem, 0, len(kategoriUmurDisplayOrder()))
	for _, k := range kategoriUmurDisplayOrder() {
		result = append(result, ModelsPasien.KategoriUmurItem{
			Kategori: k,
			Jumlah:   counts[k],
		})
	}
	return result
}
