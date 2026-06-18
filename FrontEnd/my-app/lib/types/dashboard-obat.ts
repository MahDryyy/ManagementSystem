export type DashboardSummary = {
  total_items: number;
  total_stock: number;
  low_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  inventory_value: number;
};

export type DashboardDistribution = {
  label: string;
  item_count: number;
  total_stock: number;
};

export type DashboardStockMovement = {
  month: string;
  barang_masuk: number;
  barang_keluar: number;
};

export type DashboardRecentActivity = {
  id: number;
  type: "masuk" | "keluar";
  kode_brng: string;
  nama_brng: string;
  qty: number;
  activity_date: string;
  activity_time: string;
  reference_no: string;
};

export type DashboardObatResponse = {
  summary: DashboardSummary;
  golongan_distribution: DashboardDistribution[];
  location_stock: { location: string; total_stock: number }[];
  stock_movement: DashboardStockMovement[];
  recent_activities: DashboardRecentActivity[];
};
