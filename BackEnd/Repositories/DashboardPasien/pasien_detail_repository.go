package repositories

import (
	ModelsPasien "BackEnd/Models/ModelsPasien"
	"database/sql"
	"fmt"
	"time"
)

func (r *dashboardRepository) GetPasienDetail(noRkmMedis string) (ModelsPasien.PasienDetail, error) {
	var d ModelsPasien.PasienDetail
	if noRkmMedis == "" {
		return d, fmt.Errorf("no_rkm_medis wajib diisi")
	}

	var (
		jk, golDarah, agama, sttsNikah, pekerjaan, umurLabel, pnd, nmIbu sql.NullString
		tglLahir, tglDaftar                                              sql.NullTime
		umurTahun                                                        int
	)

	err := r.db.QueryRow(`
		SELECT
			p.no_rkm_medis,
			p.nm_pasien,
			IFNULL(p.no_ktp, ''),
			p.jk,
			IFNULL(p.tmp_lahir, ''),
			p.tgl_lahir,
			TIMESTAMPDIFF(YEAR, p.tgl_lahir, CURDATE()),
			p.gol_darah,
			p.agama,
			p.stts_nikah,
			p.pekerjaan,
			p.umur,
			IFNULL(p.alamat, ''),
			IFNULL(p.no_tlp, ''),
			IFNULL(p.email, ''),
			IFNULL(p.kd_pj, ''),
			IFNULL(pj.png_jawab, ''),
			IFNULL(p.no_peserta, ''),
			IFNULL(p.perusahaan_pasien, ''),
			p.tgl_daftar,
			IFNULL(p.keluarga, ''),
			IFNULL(p.namakeluarga, ''),
			IFNULL(p.pekerjaanpj, ''),
			IFNULL(p.alamatpj, ''),
			IFNULL(p.kelurahanpj, ''),
			IFNULL(p.kecamatanpj, ''),
			IFNULL(p.kabupatenpj, ''),
			IFNULL(p.propinsipj, ''),
			IFNULL(p.pnd, ''),
			IFNULL(p.nm_ibu, ''),
			IFNULL((
				SELECT CONCAT(
					b.nm_bangsal,
					' · ',
					ki.kd_kamar,
					IF(k.kelas IS NOT NULL AND k.kelas <> '', CONCAT(' (', k.kelas, ')'), '')
				)
				FROM kamar_inap ki
				INNER JOIN reg_periksa rp2 ON ki.no_rawat = rp2.no_rawat
				LEFT JOIN kamar k ON ki.kd_kamar = k.kd_kamar
				LEFT JOIN bangsal b ON k.kd_bangsal = b.kd_bangsal
				WHERE rp2.no_rkm_medis = p.no_rkm_medis
					AND (ki.tgl_keluar = '0000-00-00' OR ki.tgl_keluar IS NULL)
				ORDER BY ki.tgl_masuk DESC, ki.jam_masuk DESC
				LIMIT 1
			), ''),
			IFNULL((
				SELECT rp3.no_rawat
				FROM kamar_inap ki2
				INNER JOIN reg_periksa rp3 ON ki2.no_rawat = rp3.no_rawat
				WHERE rp3.no_rkm_medis = p.no_rkm_medis
					AND (ki2.tgl_keluar = '0000-00-00' OR ki2.tgl_keluar IS NULL)
				ORDER BY ki2.tgl_masuk DESC
				LIMIT 1
			), ''),
			IFNULL((
				SELECT rp4.status_lanjut
				FROM reg_periksa rp4
				WHERE rp4.no_rkm_medis = p.no_rkm_medis
				ORDER BY rp4.tgl_registrasi DESC, rp4.jam_reg DESC
				LIMIT 1
			), '')
		FROM pasien p
		LEFT JOIN penjab pj ON p.kd_pj = pj.kd_pj
		WHERE p.no_rkm_medis = ?
	`, noRkmMedis).Scan(
		&d.Identitas.NoRkmMedis,
		&d.Identitas.Nama,
		&d.Identitas.NoKTP,
		&jk,
		&d.Identitas.TmpLahir,
		&tglLahir,
		&umurTahun,
		&golDarah,
		&agama,
		&sttsNikah,
		&pekerjaan,
		&umurLabel,
		&d.Kontak.Alamat,
		&d.Kontak.NoTlp,
		&d.Kontak.Email,
		&d.Penjamin.KdPj,
		&d.Penjamin.Penjamin,
		&d.Penjamin.NoPeserta,
		&d.Penjamin.Perusahaan,
		&tglDaftar,
		&d.Keluarga.Hubungan,
		&d.Keluarga.Nama,
		&d.Keluarga.Pekerjaan,
		&d.Keluarga.Alamat,
		&d.Keluarga.Kelurahan,
		&d.Keluarga.Kecamatan,
		&d.Keluarga.Kabupaten,
		&d.Keluarga.Propinsi,
		&pnd,
		&nmIbu,
		&d.Perawatan.RuanganAktif,
		&d.Perawatan.NoRawatAktif,
		&d.Perawatan.StatusRawat,
	)
	if err == sql.ErrNoRows {
		return d, fmt.Errorf("pasien tidak ditemukan")
	}
	if err != nil {
		return d, fmt.Errorf("detail pasien: %w", err)
	}

	if tglLahir.Valid {
		d.Identitas.TglLahir = tglLahir.Time
	}
	d.Identitas.UmurTahun = umurTahun
	d.Identitas.JK = labelJenisKelamin(jk.String)
	d.Identitas.GolDarah = golDarah.String
	d.Identitas.Agama = agama.String
	d.Identitas.SttsNikah = sttsNikah.String
	d.Identitas.Pekerjaan = pekerjaan.String
	d.Identitas.UmurLabel = umurLabel.String
	d.Lainnya.Pendidikan = pnd.String
	d.Lainnya.NmIbu = nmIbu.String
	if tglDaftar.Valid && !tglDaftar.Time.IsZero() && tglDaftar.Time.Year() > 1 {
		d.Lainnya.TglDaftar = tglDaftar.Time.Format(time.RFC3339)
	}
	d.Perawatan.StatusRawat = labelStatusLanjut(d.Perawatan.StatusRawat)

	return d, nil
}
