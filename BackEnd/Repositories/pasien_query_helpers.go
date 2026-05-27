package repositories

// Subquery diagnosa untuk baris pasien (butuh alias rp.no_rawat).
const sqlDiagnosaSubquery = `IFNULL((
	SELECT GROUP_CONCAT(DISTINCT peny.nm_penyakit ORDER BY dp.prioritas SEPARATOR ', ')
	FROM diagnosa_pasien dp
	INNER JOIN penyakit peny ON dp.kd_penyakit = peny.kd_penyakit
	WHERE dp.no_rawat = rp.no_rawat
	LIMIT 3
), '-')`

const sqlRuanganKosong = `''`

// Ruangan rawat inap aktif: nama bangsal · kode kamar (kelas).
const sqlRuanganInap = `IFNULL(CONCAT(
	b.nm_bangsal,
	' · ',
	ki.kd_kamar,
	IF(k.kelas IS NOT NULL AND k.kelas <> '', CONCAT(' (', k.kelas, ')'), '')
), '-')`
