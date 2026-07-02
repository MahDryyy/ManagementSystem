-- =====================================================================
-- INDEX OPTIMASI DASHBOARD & LAPORAN KEUANGAN (Khanza / MariaDB 10.11)
-- =====================================================================
-- Tujuan: laporan harian / mingguan / bulanan / TAHUNAN < 1 detik.
--
-- Cara pakai (MariaDB - Khanza standar):
--   Jalankan di database `sik` SAAT TRAFFIC RENDAH (mis. malam hari).
--   Pembuatan index mengunci tabel sebentar.
--
--   Via docker:
--     docker exec -i management-db mariadb -uroot -prootpassword sik < keuangan_indexes.sql
--   Via mysql client:
--     mysql -h 127.0.0.1 -P 3306 -uroot -p sik < keuangan_indexes.sql
--
-- Catatan: sintaks "ADD INDEX IF NOT EXISTS" butuh MariaDB (>=10.0.2).
--          Jika server-nya MySQL, hapus "IF NOT EXISTS" dan lewati index
--          yang sudah ada secara manual.
--
-- Kenapa index ini bikin cepat:
--   Semua filter periode di kode membandingkan KOLOM MENTAH dengan
--   konstanta (rp.tgl_registrasi >= DATE_FORMAT(CURDATE(),'%Y-01-01')),
--   sehingga "sargable" -> optimizer bisa range-scan via index, bukan
--   full table scan jutaan baris.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) reg_periksa : INDEX PALING PENTING (biang lambatnya semua laporan)
-- ---------------------------------------------------------------------
-- reg_periksa TIDAK punya index di tgl_registrasi -> tiap filter periode
-- (harian/mingguan/tahunan) full scan. Composite (tgl_registrasi, no_rawat)
-- melayani 3 hal sekaligus:
--   a. range filter periode  (WHERE rp.tgl_registrasi >= ...)
--   b. urutan ORDER BY rp.tgl_registrasi DESC
--   c. menyediakan no_rawat sbg join key tanpa lookup ke tabel (covering)
ALTER TABLE reg_periksa
  ADD INDEX IF NOT EXISTS idx_reg_periksa_tgl_rawat (tgl_registrasi, no_rawat);


-- ---------------------------------------------------------------------
-- 2) nota_jalan / nota_inap : join key no_rawat
-- ---------------------------------------------------------------------
-- PK nota_jalan/nota_inap = no_nota, jadi join "ON d.no_rawat = nj.no_rawat"
-- (dipakai di detail export & histori) sering tanpa index -> nested loop lambat.
ALTER TABLE nota_jalan
  ADD INDEX IF NOT EXISTS idx_nota_jalan_no_rawat (no_rawat);
ALTER TABLE nota_inap
  ADD INDEX IF NOT EXISTS idx_nota_inap_no_rawat (no_rawat);


-- ---------------------------------------------------------------------
-- 3) pengeluaran_harian : tanggal (untuk histori & grafik pengeluaran)
-- ---------------------------------------------------------------------
-- Membantu ORDER BY ph.tanggal DESC dan menyaring baris valid.
-- (Catatan: query yang membungkus kolom -- YEAR(ph.tanggal), DATE(ph.tanggal) --
--  tidak bisa pakai index ini; tapi tabel ini kecil jadi tetap cepat.)
ALTER TABLE pengeluaran_harian
  ADD INDEX IF NOT EXISTS idx_pengeluaran_harian_tanggal (tanggal);


-- =====================================================================
-- 4) OPSIONAL -- VERIFIKASI DULU sebelum menambah
-- =====================================================================
-- Tabel di bawah BIASANYA sudah punya no_rawat sebagai kolom PERTAMA pada
-- PRIMARY KEY (mis. detail_nota_jalan PK = (no_rawat, no_nota, kd_jenis_prw),
-- billing PK diawali no_rawat). Jika benar, index tambahan di bawah REDUNDAN.
--
-- Cek dulu -- kalom Key_name menampilkan no_rawat sbg Seq_in_index = 1,
-- TIDAK perlu ditambah:
--   SHOW INDEX FROM detail_nota_jalan;
--   SHOW INDEX FROM detail_nota_inap;
--   SHOW INDEX FROM billing;
--
-- Jika ternyata BELUM ada, baru aktifkan baris berikut (hapus komentar):
--
-- ALTER TABLE detail_nota_jalan
--   ADD INDEX IF NOT EXISTS idx_dnj_no_rawat (no_rawat);
-- ALTER TABLE detail_nota_inap
--   ADD INDEX IF NOT EXISTS idx_dni_no_rawat (no_rawat);
-- ALTER TABLE billing
--   ADD INDEX IF NOT EXISTS idx_billing_no_rawat_status (no_rawat, status);


-- =====================================================================
-- 5) LAPORAN PASIEN (mendukung query batch setelah perbaikan N+1)
-- =====================================================================
-- Setelah N+1 dihapus, laporan pasien menembak query batch:
--   - diagnosa semua pasien (JOIN diagnosa_pasien -> reg_periksa -> penyakit)
--   - keanggotaan kategori khusus (EXISTS ke diagnosa_pasien per no_rawat)
-- Keduanya bergantung index no_rawat di diagnosa_pasien.
--
-- diagnosa_pasien biasanya PK diawali no_rawat -> cek dulu:
--   SHOW INDEX FROM diagnosa_pasien;
-- Jika no_rawat BELUM jadi kolom pertama index mana pun, aktifkan:
-- ALTER TABLE diagnosa_pasien
--   ADD INDEX IF NOT EXISTS idx_diagnosa_pasien_no_rawat (no_rawat);
--
-- reg_periksa(no_rkm_medis) mempercepat join reg_periksa <-> pasien pada
-- laporan pasien berfilter periode. Cek "SHOW INDEX FROM reg_periksa;" dulu:
-- ALTER TABLE reg_periksa
--   ADD INDEX IF NOT EXISTS idx_reg_periksa_no_rkm (no_rkm_medis);


-- =====================================================================
-- VERIFIKASI HASIL (harus muncul "range" / "ref" + "Using index",
-- BUKAN "ALL" / full scan):
-- =====================================================================
-- Contoh cek laporan TAHUNAN (paling berat):
--   EXPLAIN
--   SELECT rp.tgl_registrasi, dnj.besar_bayar
--   FROM detail_nota_jalan dnj
--   INNER JOIN reg_periksa rp ON dnj.no_rawat = rp.no_rawat
--   WHERE rp.tgl_registrasi >= DATE_FORMAT(CURDATE(), '%Y-01-01')
--     AND rp.tgl_registrasi <= CURDATE();
--
-- Setelah index pasang, jalankan ANALYZE supaya statistik optimizer segar:
--   ANALYZE TABLE reg_periksa, detail_nota_jalan, detail_nota_inap,
--                 nota_jalan, nota_inap, pengeluaran_harian;
