package repositories

import (
	ModelsObat "BackEnd/Models/ModelsObat"
	"database/sql"
	"fmt"
)

type DashboardObatRepository interface {
	GetDashboard() (ModelsObat.DashboardResponse, error)
}

type dashboardObatRepository struct {
	db *sql.DB
}

func NewDashboardObatRepository(db *sql.DB) DashboardObatRepository {
	return &dashboardObatRepository{db: db}
}

func (r *dashboardObatRepository) GetDashboard() (ModelsObat.DashboardResponse, error) {
	var response ModelsObat.DashboardResponse
	var expiringSoonCount int64
	var expiredCount int64

	err := r.db.QueryRow(`
        SELECT
            COUNT(DISTINCT databarang.kode_brng) AS total_items,
            CAST(COALESCE(SUM(IFNULL(gudangbarang.stok, 0)), 0) AS SIGNED) AS total_stock,
            COALESCE(SUM(IFNULL(gudangbarang.stok, 0) * databarang.h_beli), 0) AS inventory_value,
            COALESCE(SUM(IF(COALESCE(gudangbarang.stok, 0) <= ?, 1, 0)), 0) AS low_stock_count
        FROM databarang
        LEFT JOIN gudangbarang
            ON databarang.kode_brng = gudangbarang.kode_brng
            AND gudangbarang.kd_bangsal = 'AP'
    `, 50).Scan(
		&response.Summary.TotalItems,
		&response.Summary.TotalStock,
		&response.Summary.InventoryValue,
		&response.Summary.LowStockCount,
	)
	if err != nil {
		return response, fmt.Errorf("ringkasan dashboard: %w", err)
	}

	if err := r.db.QueryRow(`
        SELECT COUNT(*)
        FROM databarang
        WHERE expire IS NOT NULL
            AND expire <> ''
            AND expire BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    `).Scan(&expiringSoonCount); err != nil {
		return response, fmt.Errorf("expiring soon: %w", err)
	}

	if err := r.db.QueryRow(`
        SELECT COUNT(*)
        FROM databarang
        WHERE expire IS NOT NULL
            AND expire <> ''
            AND expire < CURDATE()
    `).Scan(&expiredCount); err != nil {
		return response, fmt.Errorf("expired count: %w", err)
	}

	response.Summary.ExpiringSoonCount = expiringSoonCount
	response.Summary.ExpiredCount = expiredCount

	golonganDistribution, err := r.getGolonganDistribution()
	if err != nil {
		return response, err
	}
	response.GolonganDistribution = golonganDistribution

	locationStock, err := r.getLocationStock()
	if err != nil {
		return response, err
	}
	response.LocationStock = locationStock

	stockMovement, err := r.getStockMovement()
	if err != nil {
		return response, err
	}
	response.StockMovement = stockMovement

	recentActivities, err := r.getRecentActivities()
	if err != nil {
		return response, err
	}
	response.RecentActivities = recentActivities

	return response, nil
}

func (r *dashboardObatRepository) getGolonganDistribution() ([]ModelsObat.DashboardDistribution, error) {
	rows, err := r.db.Query(`
        SELECT
            COALESCE(golongan_barang.nama, 'Tidak Diketahui') AS label,
            COUNT(DISTINCT databarang.kode_brng) AS item_count,
            CAST(COALESCE(SUM(IFNULL(gudangbarang.stok, 0)), 0) AS SIGNED) AS total_stock
        FROM databarang
        LEFT JOIN gudangbarang
            ON databarang.kode_brng = gudangbarang.kode_brng
            AND gudangbarang.kd_bangsal = 'AP'
        LEFT JOIN golongan_barang
            ON databarang.kode_golongan = golongan_barang.kode
        GROUP BY golongan_barang.nama
        ORDER BY total_stock DESC
        LIMIT 20
    `)
	if err != nil {
		return nil, fmt.Errorf("distribusi golongan: %w", err)
	}
	defer rows.Close()

	var items []ModelsObat.DashboardDistribution
	for rows.Next() {
		var item ModelsObat.DashboardDistribution
		if err := rows.Scan(&item.Label, &item.ItemCount, &item.TotalStock); err != nil {
			return nil, fmt.Errorf("scan distribusi golongan: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("distribusi golongan rows: %w", err)
	}
	return items, nil
}

func (r *dashboardObatRepository) getLocationStock() ([]ModelsObat.DashboardLocation, error) {
	rows, err := r.db.Query(`
        SELECT
            COALESCE(gudangbarang.kd_bangsal, 'AP') AS location,
            CAST(COALESCE(SUM(gudangbarang.stok), 0) AS SIGNED) AS total_stock
        FROM gudangbarang
        GROUP BY gudangbarang.kd_bangsal
        ORDER BY total_stock DESC
    `)
	if err != nil {
		return nil, fmt.Errorf("lokasi stok: %w", err)
	}
	defer rows.Close()

	var items []ModelsObat.DashboardLocation
	for rows.Next() {
		var item ModelsObat.DashboardLocation
		if err := rows.Scan(&item.Location, &item.TotalStock); err != nil {
			return nil, fmt.Errorf("scan lokasi stok: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lokasi stok rows: %w", err)
	}
	return items, nil
}

func (r *dashboardObatRepository) getStockMovement() ([]ModelsObat.DashboardStockMovement, error) {
	rows, err := r.db.Query(`
        SELECT
            DATE_FORMAT(DATE_SUB(anchor.latest_month, INTERVAL month_offsets.month_offset MONTH), '%Y-%m') AS month,
            CAST(COALESCE(movement.barang_masuk, 0) AS SIGNED) AS barang_masuk,
            CAST(COALESCE(movement.barang_keluar, 0) AS SIGNED) AS barang_keluar
        FROM (
            SELECT COALESCE(MAX(tanggal), CURDATE()) AS latest_month
            FROM riwayat_barang_medis
            WHERE tanggal IS NOT NULL
                AND (masuk > 0 OR keluar > 0)
                AND (kd_bangsal = 'AP' OR kd_bangsal IS NULL OR kd_bangsal = '')
        ) anchor
        JOIN (
            SELECT 4 AS month_offset
            UNION ALL SELECT 3
            UNION ALL SELECT 2
            UNION ALL SELECT 1
            UNION ALL SELECT 0
        ) month_offsets
        LEFT JOIN (
            SELECT
                DATE_FORMAT(riwayat_barang_medis.tanggal, '%Y-%m') AS month,
                COALESCE(SUM(riwayat_barang_medis.masuk), 0) AS barang_masuk,
                COALESCE(SUM(riwayat_barang_medis.keluar), 0) AS barang_keluar
            FROM riwayat_barang_medis
            WHERE riwayat_barang_medis.tanggal IS NOT NULL
                AND riwayat_barang_medis.tanggal >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 4 MONTH), '%Y-%m-01')
                AND (
                    riwayat_barang_medis.kd_bangsal = 'AP'
                    OR riwayat_barang_medis.kd_bangsal IS NULL
                    OR riwayat_barang_medis.kd_bangsal = ''
                )
            GROUP BY DATE_FORMAT(riwayat_barang_medis.tanggal, '%Y-%m')
        ) movement
            ON DATE_FORMAT(DATE_SUB(anchor.latest_month, INTERVAL month_offsets.month_offset MONTH), '%Y-%m') = movement.month
        ORDER BY month_offsets.month_offset DESC
    `)
	if err != nil {
		return nil, fmt.Errorf("pergerakan stok: %w", err)
	}
	defer rows.Close()

	var items []ModelsObat.DashboardStockMovement
	for rows.Next() {
		var item ModelsObat.DashboardStockMovement
		if err := rows.Scan(&item.Month, &item.BarangMasuk, &item.BarangKeluar); err != nil {
			return nil, fmt.Errorf("scan pergerakan stok: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("pergerakan stok rows: %w", err)
	}
	return items, nil
}

func (r *dashboardObatRepository) getRecentActivities() ([]ModelsObat.DashboardRecentActivity, error) {
	rows, err := r.db.Query(`
        SELECT
            0 AS id,
            CASE
                WHEN COALESCE(recent.masuk, 0) > 0 THEN 'masuk'
                ELSE 'keluar'
            END AS activity_type,
            recent.kode_brng,
            COALESCE(databarang.nama_brng, recent.kode_brng) AS nama_brng,
            CAST(
                CASE
                    WHEN COALESCE(recent.masuk, 0) > 0 THEN COALESCE(recent.masuk, 0)
                    ELSE COALESCE(recent.keluar, 0)
                END
                AS SIGNED
            ) AS qty,
            DATE_FORMAT(recent.tanggal, '%Y-%m-%d') AS activity_date,
            IFNULL(TIME_FORMAT(recent.jam, '%H:%i:%s'), '') AS activity_time,
            COALESCE(
                NULLIF(recent.no_faktur, ''),
                NULLIF(recent.no_batch, ''),
                NULLIF(recent.keterangan, ''),
                recent.posisi,
                ''
            ) AS reference_no
        FROM (
            SELECT
                kode_brng,
                masuk,
                keluar,
                tanggal,
                jam,
                no_faktur,
                no_batch,
                keterangan,
                posisi
            FROM riwayat_barang_medis
            WHERE tanggal IS NOT NULL
                AND (masuk > 0 OR keluar > 0)
                AND kd_bangsal = 'AP'
            ORDER BY tanggal DESC, jam DESC
            LIMIT 10
        ) recent
        LEFT JOIN databarang
            ON recent.kode_brng = databarang.kode_brng
        ORDER BY recent.tanggal DESC, recent.jam DESC
    `)
	if err != nil {
		return nil, fmt.Errorf("aktivitas terbaru: %w", err)
	}
	defer rows.Close()

	var items []ModelsObat.DashboardRecentActivity
	for rows.Next() {
		var item ModelsObat.DashboardRecentActivity
		if err := rows.Scan(
			&item.ID,
			&item.Type,
			&item.KodeBrng,
			&item.NamaBrng,
			&item.Qty,
			&item.ActivityDate,
			&item.ActivityTime,
			&item.ReferenceNo,
		); err != nil {
			return nil, fmt.Errorf("scan aktivitas terbaru: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("aktivitas terbaru rows: %w", err)
	}
	return items, nil
}
