package repositories

import (
	ModelsObat "BackEnd/Models/ModelsObat"
	"database/sql"
	"fmt"
	"sync"
	"time"
)

type DashboardObatRepository interface {
	GetDashboard(key ModelsObat.DashboardCacheKey) (ModelsObat.DashboardResponse, error)
}

type dashboardObatRepository struct {
	db *sql.DB
}

func NewDashboardObatRepository(db *sql.DB) DashboardObatRepository {
	return &dashboardObatRepository{db: db}
}

const dashboardCacheTTL = 30 * time.Second

var (
	dashboardCache   = make(map[ModelsObat.DashboardCacheKey]ModelsObat.DashboardCacheEntry)
	dashboardCacheMu sync.RWMutex
)

// gudangAPStockJoin is reused across queries that JOIN gudangbarang filtered to bangsal 'AP'.
const gudangAPStockJoin = `
LEFT JOIN (
    SELECT kode_brng, SUM(stok) AS total_stok
    FROM gudangbarang WHERE kd_bangsal = 'AP' AND stok > 0
    GROUP BY kode_brng
) gudang_stok ON databarang.kode_brng = gudang_stok.kode_brng
`

func (r *dashboardObatRepository) GetDashboard(key ModelsObat.DashboardCacheKey) (ModelsObat.DashboardResponse, error) {
	// Serve from cache if still valid
	dashboardCacheMu.RLock()
	if entry, ok := dashboardCache[key]; ok && time.Since(entry.Timestamp) < dashboardCacheTTL {
		dashboardCacheMu.RUnlock()
		return entry.Data, nil
	}
	dashboardCacheMu.RUnlock()

	var (
		summary              ModelsObat.DashboardSummary
		expiringSoonCount    int64
		expiredCount         int64
		golonganDistribution = []ModelsObat.DashboardDistribution{}
		golonganTotal        int64
		locationStock        = []ModelsObat.DashboardLocation{}
		stockMovement        = []ModelsObat.DashboardStockMovement{}
		recentActivities     = []ModelsObat.DashboardRecentActivity{}
		activitiesTotal      int64
	)

	var wg sync.WaitGroup
	var errMu sync.Mutex
	var firstErr error

	captureErr := func(e error) {
		if e == nil {
			return
		}
		errMu.Lock()
		if firstErr == nil {
			firstErr = e
		}
		errMu.Unlock()
	}

	wg.Add(5)

	// 1. Summary + stock change from pre-computed table
	go func() {
		defer wg.Done()

		type sRow struct {
			TotalItems     int64   `db:"total_items"`
			TotalStock     int64   `db:"total_stock"`
			InventoryValue float64 `db:"inventory_value"`
			LowStockCount  int64   `db:"low_stock_count"`
			ExpiringSoon   int64   `db:"expiring_soon_count"`
			Expired        int64   `db:"expired_count"`
		}
		var row sRow
		err := r.db.QueryRow(`
			SELECT total_items, total_stock, inventory_value, low_stock_count,
				expiring_soon_count, expired_count
			FROM monitoring_stock_summary WHERE id = 1
		`).Scan(&row.TotalItems, &row.TotalStock, &row.InventoryValue,
			&row.LowStockCount, &row.ExpiringSoon, &row.Expired)
		if err != nil {
			// Pre-computed table not available — fallback to live queries
			captureErr(r.liveSummaryFallback(&summary, &expiringSoonCount, &expiredCount))
			return
		}

		// If pre-computed has data, use it; otherwise live fallback
		if row.TotalStock == 0 {
			captureErr(r.liveSummaryFallback(&summary, &expiringSoonCount, &expiredCount))
			return
		}

		summary.TotalItems = row.TotalItems
		summary.TotalStock = row.TotalStock
		summary.InventoryValue = row.InventoryValue
		summary.LowStockCount = row.LowStockCount
		expiringSoonCount = row.ExpiringSoon
		expiredCount = row.Expired

		// Stock change vs previous month
		captureErr(r.stockChangePercent(&summary, row.TotalStock))
	}()

	// 2. Golongan distribution (paginated)
	go func() {
		defer wg.Done()

		err := r.db.QueryRow(`
			SELECT COUNT(*) FROM (
				SELECT golongan_barang.nama
				FROM databarang
				` + gudangAPStockJoin + `
				LEFT JOIN golongan_barang
					ON databarang.kode_golongan = golongan_barang.kode
				GROUP BY golongan_barang.nama
			) grouped
		`).Scan(&golonganTotal)
		if err != nil {
			captureErr(fmt.Errorf("golongan total: %w", err))
			return
		}

		rows, err := r.db.Query(`
			SELECT
				COALESCE(golongan_barang.nama, 'Tidak Diketahui') AS label,
				COUNT(DISTINCT databarang.kode_brng) AS item_count,
				CAST(COALESCE(SUM(gudang_stok.total_stok), 0) AS SIGNED) AS total_stock
			FROM databarang
			`+gudangAPStockJoin+`
			LEFT JOIN golongan_barang
				ON databarang.kode_golongan = golongan_barang.kode
			GROUP BY golongan_barang.nama
			ORDER BY total_stock DESC
			LIMIT ? OFFSET ?
		`, key.GolonganLimit, (key.GolonganPage-1)*key.GolonganLimit)
		if err != nil {
			captureErr(fmt.Errorf("golongan distribution: %w", err))
			return
		}
		defer rows.Close()

		for rows.Next() {
			var item ModelsObat.DashboardDistribution
			if err := rows.Scan(&item.Label, &item.ItemCount, &item.TotalStock); err != nil {
				captureErr(fmt.Errorf("scan golongan: %w", err))
				return
			}
			golonganDistribution = append(golonganDistribution, item)
		}
		if err := rows.Err(); err != nil {
			captureErr(fmt.Errorf("golongan rows: %w", err))
		}
	}()

	// 3. Location stock
	go func() {
		defer wg.Done()
		rows, err := r.db.Query(`
			SELECT
				COALESCE(kd_bangsal, 'AP') AS location,
				CAST(COALESCE(SUM(stok), 0) AS SIGNED) AS total_stock
			FROM gudangbarang
			GROUP BY kd_bangsal
			ORDER BY total_stock DESC
		`)
		if err != nil {
			captureErr(fmt.Errorf("location stock: %w", err))
			return
		}
		defer rows.Close()

		for rows.Next() {
			var item ModelsObat.DashboardLocation
			if err := rows.Scan(&item.Location, &item.TotalStock); err != nil {
				captureErr(fmt.Errorf("scan location: %w", err))
				return
			}
			locationStock = append(locationStock, item)
		}
		if err := rows.Err(); err != nil {
			captureErr(fmt.Errorf("location rows: %w", err))
		}
	}()

	// 4. Stock movement (last 5 months)
	go func() {
		defer wg.Done()
		rows, err := r.db.Query(`
			SELECT
				month,
				barang_masuk,
				barang_keluar
			FROM (
				SELECT month, barang_masuk, barang_keluar
				FROM dashboard_stock_movement
				WHERE kd_bangsal = 'AP'
					AND month <= DATE_FORMAT(CURDATE(), '%Y-%m')
				ORDER BY month DESC
				LIMIT 5
			) recent
			ORDER BY month ASC
		`)
		if err != nil {
			captureErr(fmt.Errorf("stock movement: %w", err))
			return
		}
		defer rows.Close()

		for rows.Next() {
			var (
				item          ModelsObat.DashboardStockMovement
				masuk, keluar float64
			)
			if err := rows.Scan(&item.Month, &masuk, &keluar); err != nil {
				captureErr(fmt.Errorf("scan movement: %w", err))
				return
			}
			item.BarangMasuk = int64(masuk)
			item.BarangKeluar = int64(keluar)
			stockMovement = append(stockMovement, item)
		}
		if err := rows.Err(); err != nil {
			captureErr(fmt.Errorf("movement rows: %w", err))
		}
	}()

	// 5. Recent activities today (paginated)
	go func() {
		defer wg.Done()

		err := r.db.QueryRow(`
			SELECT COUNT(*)
			FROM riwayat_barang_medis r
			WHERE r.kd_bangsal = 'AP'
				AND r.tanggal = CURDATE()
				AND (r.masuk > 0 OR r.keluar > 0)
		`).Scan(&activitiesTotal)
		if err != nil {
			captureErr(fmt.Errorf("activities count: %w", err))
			return
		}

		rows, err := r.db.Query(`
			SELECT
				0 AS id,
				CASE
					WHEN COALESCE(r.masuk, 0) > 0 THEN 'masuk'
					ELSE 'keluar'
				END AS activity_type,
				r.kode_brng,
				COALESCE(d.nama_brng, r.kode_brng) AS nama_brng,
				CAST(
					CASE
						WHEN COALESCE(r.masuk, 0) > 0 THEN COALESCE(r.masuk, 0)
						ELSE COALESCE(r.keluar, 0)
					END AS SIGNED
				) AS qty,
				DATE_FORMAT(r.tanggal, '%Y-%m-%d') AS activity_date,
				IFNULL(TIME_FORMAT(r.jam, '%H:%i:%s'), '') AS activity_time,
				COALESCE(
					NULLIF(r.no_faktur, ''),
					NULLIF(r.no_batch, ''),
					NULLIF(r.keterangan, ''),
					r.posisi,
					''
				) AS reference_no
			FROM riwayat_barang_medis r
			LEFT JOIN databarang d ON r.kode_brng = d.kode_brng
			WHERE r.kd_bangsal = 'AP'
				AND r.tanggal = CURDATE()
				AND (r.masuk > 0 OR r.keluar > 0)
			ORDER BY r.tanggal DESC, r.jam DESC
			LIMIT ? OFFSET ?
		`, key.ActivitiesLimit, (key.ActivitiesPage-1)*key.ActivitiesLimit)
		if err != nil {
			captureErr(fmt.Errorf("recent activities: %w", err))
			return
		}
		defer rows.Close()

		for rows.Next() {
			var item ModelsObat.DashboardRecentActivity
			if err := rows.Scan(
				&item.ID, &item.Type, &item.KodeBrng, &item.NamaBrng,
				&item.Qty, &item.ActivityDate, &item.ActivityTime, &item.ReferenceNo,
			); err != nil {
				captureErr(fmt.Errorf("scan activity: %w", err))
				return
			}
			recentActivities = append(recentActivities, item)
		}
		if err := rows.Err(); err != nil {
			captureErr(fmt.Errorf("activity rows: %w", err))
		}
	}()

	wg.Wait()

	if firstErr != nil {
		return ModelsObat.DashboardResponse{}, fmt.Errorf("dashboard: %w", firstErr)
	}

	summary.ExpiringSoonCount = expiringSoonCount
	summary.ExpiredCount = expiredCount

	response := ModelsObat.DashboardResponse{
		Summary:              summary,
		GolonganDistribution: golonganDistribution,
		LocationStock:        locationStock,
		StockMovement:        stockMovement,
		RecentActivities:     recentActivities,
		Pagination: ModelsObat.DashboardPaginationMeta{
			Golongan: ModelsObat.DashboardPagination{
				Page:       int64(key.GolonganPage),
				Limit:      int64(key.GolonganLimit),
				Total:      golonganTotal,
				TotalPages: (golonganTotal + int64(key.GolonganLimit) - 1) / int64(key.GolonganLimit),
			},
			Activities: ModelsObat.DashboardPagination{
				Page:       int64(key.ActivitiesPage),
				Limit:      int64(key.ActivitiesLimit),
				Total:      activitiesTotal,
				TotalPages: (activitiesTotal + int64(key.ActivitiesLimit) - 1) / int64(key.ActivitiesLimit),
			},
		},
	}

	dashboardCacheMu.Lock()
	dashboardCache[key] = ModelsObat.DashboardCacheEntry{Data: response, Timestamp: time.Now()}
	dashboardCacheMu.Unlock()

	return response, nil
}

func (r *dashboardObatRepository) liveSummaryFallback(summary *ModelsObat.DashboardSummary, expiringSoon, expired *int64) error {
	err := r.db.QueryRow(`
		SELECT
			COUNT(DISTINCT d.kode_brng) AS total_items,
			COALESCE(SUM(COALESCE(gs.total_stok, 0)), 0) AS total_stock,
			COALESCE(SUM(COALESCE(gs.total_stok, 0) * d.h_beli), 0) AS inventory_value,
			COALESCE(SUM(CASE WHEN COALESCE(gs.total_stok, 0) <= 50 THEN 1 ELSE 0 END), 0) AS low_stock_count
		FROM databarang d
		LEFT JOIN (
			SELECT kode_brng, SUM(stok) AS total_stok
			FROM gudangbarang WHERE kd_bangsal = 'AP' AND stok > 0
			GROUP BY kode_brng
		) gs ON d.kode_brng = gs.kode_brng
	`).Scan(&summary.TotalItems, &summary.TotalStock, &summary.InventoryValue, &summary.LowStockCount)
	if err != nil {
		return fmt.Errorf("live summary: %w", err)
	}

	err = r.db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN expire BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN expire < CURDATE() THEN 1 ELSE 0 END), 0)
		FROM databarang
		WHERE expire IS NOT NULL AND expire != '' AND expire != '0000-00-00'
			AND expire >= '1990-01-01' AND expire <= DATE_ADD(CURDATE(), INTERVAL 15 YEAR)
	`).Scan(expiringSoon, expired)
	if err != nil {
		return fmt.Errorf("live expiry: %w", err)
	}

	return nil
}

func (r *dashboardObatRepository) stockChangePercent(summary *ModelsObat.DashboardSummary, totalStock int64) error {
	var masuk, keluar float64
	err := r.db.QueryRow(`
		SELECT COALESCE(SUM(barang_masuk), 0), COALESCE(SUM(barang_keluar), 0)
		FROM dashboard_stock_movement
		WHERE kd_bangsal = 'AP'
			AND month >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m')
			AND month < DATE_FORMAT(CURDATE(), '%Y-%m')
	`).Scan(&masuk, &keluar)
	if err != nil {
		return fmt.Errorf("stock change: %w", err)
	}

	netChange := masuk - keluar
	prevStock := float64(totalStock) - netChange
	if prevStock > 0 {
		pct := (float64(totalStock) - prevStock) / prevStock * 100
		summary.StockChangePercent = &pct
	}
	return nil
}
