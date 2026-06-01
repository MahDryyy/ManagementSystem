-- Rekomendasi index untuk dashboard keuangan (Khanza / MariaDB).
-- Jalankan di database `sik` saat traffic rendah.

-- PENTING: reg_periksa tidak punya index tgl_registrasi — filter periode saat ini full scan.
ALTER TABLE reg_periksa
  ADD INDEX idx_reg_periksa_tgl_rawat (tgl_registrasi, no_rawat);

-- Verifikasi (harus pakai index idx_reg_periksa_tgl_rawat atau range scan):
-- EXPLAIN SELECT COUNT(*)
-- FROM detail_nota_jalan d
-- INNER JOIN reg_periksa rp ON d.no_rawat = rp.no_rawat
-- WHERE rp.tgl_registrasi >= DATE_FORMAT(CURDATE(), '%Y-%m-01');
