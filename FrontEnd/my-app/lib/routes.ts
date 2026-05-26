export type AppRoute =
  | "dashboard"
  | "dashboard-pasien"
  | "dashboard-obat"
  | "dashboard-website"
  | "dashboard-laporan"
  | "dashboard-keuangan"
  | "settings"
  | "help";

export const DEFAULT_ROUTE: AppRoute = "dashboard-pasien";
