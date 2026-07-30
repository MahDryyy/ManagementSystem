"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  Hospital,
  Package,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { fetchDashboardObat } from "@/lib/api/dashboard-obat";
import { fetchDashboardPasien } from "@/lib/api/dashboard-pasien";
import {
  fetchHistoriKeuangan,
  fetchHistoriPengeluaran,
} from "@/lib/api/dashboard-keuangan";
import type { DashboardObatResponse } from "@/lib/types/dashboard-obat";
import type { DashboardPasienResponse } from "@/lib/types/dashboard-pasien";
import type { HistoriItem } from "@/lib/types/dashboard-keuangan";
import PasienDrilldownModal from "@/components/dashboard-pasien/PasienDrilldownModal";
import type { DrilldownModalConfig } from "@/lib/drilldown";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

export default function DashboardOverview() {
  const [pasien, setPasien] = useState<DashboardPasienResponse | null>(null);
  const [obat, setObat] = useState<DashboardObatResponse | null>(null);
  const [histori, setHistori] = useState<HistoriItem[]>([]);
  const [historiPengeluaran, setHistoriPengeluaran] = useState<HistoriItem[]>([]);
  const [drilldownConfig, setDrilldownConfig] = useState<DrilldownModalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [pasienData, obatData, historiData, pengeluaranData] =
        await Promise.all([
          fetchDashboardPasien({ limit: 5 }),
          fetchDashboardObat(),
          fetchHistoriKeuangan(5, 0),
          fetchHistoriPengeluaran({ limit: 5, offset: 0, periode: "bulan_ini" }),
        ]);

      setPasien(pasienData);
      setObat(obatData);
      setHistori(historiData.data ?? []);
      setHistoriPengeluaran(
        (pengeluaranData.data ?? []).map((row) => ({
          id: row.no_keluar,
          judul: row.keterangan?.trim() || row.kategori || "Pengeluaran",
          tanggal: row.tanggal,
          jenis: "pengeluaran" as const,
          nominal: row.biaya,
          kategori: row.kategori,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat dashboard utama");
      setPasien(null);
      setObat(null);
      setHistori([]);
      setHistoriPengeluaran([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (loading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-full bg-zinc-200" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse rounded-2xl border border-zinc-200 bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-zinc-50 p-10 text-center">
        <p className="text-sm font-medium text-red-600">{error}</p>
        <button
          type="button"
          onClick={loadOverview}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  const status = pasien?.status_perawatan;
  const summary = obat?.summary;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard Utama</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ringkasan cepat pasien, obat, dan keuangan dari data backend yang sudah tersedia.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-600">
              <Hospital className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Status Perawatan Pasien</p>
              <p className="text-xs text-zinc-500">Pasien aktif saat ini</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Total aktif</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {status?.total_aktif ?? 0}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setDrilldownConfig({
                  title: "Daftar pasien rawat inap aktif",
                  subtitle: "Data pasien yang sedang menjalani rawat inap",
                  tipe: "status_inap_aktif",
                })
              }
              className="rounded-xl bg-zinc-50 p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              <p className="text-xs uppercase tracking-wide text-zinc-400">Rawat inap</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {status?.rawat_inap_aktif ?? 0}
              </p>
              <p className="mt-2 text-xs font-medium text-cyan-600">Klik untuk lihat daftar</p>
            </button>
            <button
              type="button"
              onClick={() =>
                setDrilldownConfig({
                  title: "Daftar pasien rawat jalan aktif",
                  subtitle: "Data pasien yang sedang menjalani rawat jalan",
                  tipe: "status_jalan_aktif",
                })
              }
              className="rounded-xl bg-zinc-50 p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50 sm:col-span-2"
            >
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>Rawat jalan</span>
                <span className="font-semibold text-zinc-900">
                  {status?.rawat_jalan_aktif ?? 0}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-cyan-600">Klik untuk lihat daftar</p>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Stok Obat</p>
              <p className="text-xs text-zinc-500">Yang perlu mendapat perhatian</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-700">Stok hampir habis</span>
                <span className="text-lg font-semibold text-amber-700">
                  {summary?.low_stock_count ?? 0}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-700">Mendekati expired</span>
                <span className="text-lg font-semibold text-rose-700">
                  {summary?.expiring_soon_count ?? 0}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-700">Sudah expired</span>
                <span className="text-lg font-semibold text-zinc-900">
                  {summary?.expired_count ?? 0}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Keuangan Terbaru</p>
              <p className="text-xs text-zinc-500">Histori pemasukan dan pengeluaran</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-700">Pemasukan</span>
                <span className="text-sm font-semibold text-emerald-700">
                  {histori.length > 0 ? formatCurrency(histori[0].nominal) : "-"}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-700">Pengeluaran</span>
                <span className="text-sm font-semibold text-rose-700">
                  {historiPengeluaran.length > 0 ? formatCurrency(historiPengeluaran[0].nominal) : "-"}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Histori Pemasukan</h2>
              <p className="text-sm text-zinc-500">Transaksi terbaru dari keuangan</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-2">
            {histori.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                Belum ada data histori pemasukan.
              </div>
            ) : (
              histori.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">{item.judul}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatShortDate(item.tanggal)} • {item.kategori ?? "Pemasukan"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(item.nominal)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Histori Pengeluaran</h2>
              <p className="text-sm text-zinc-500">Catatan belanja dan pengeluaran</p>
            </div>
            <div className="rounded-full bg-rose-50 p-2 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-2">
            {historiPengeluaran.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                Belum ada data histori pengeluaran.
              </div>
            ) : (
              historiPengeluaran.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">{item.judul}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatShortDate(item.tanggal)} • {item.kategori ?? "Pengeluaran"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-rose-600">
                      {formatCurrency(item.nominal)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <PasienDrilldownModal
        config={drilldownConfig}
        onClose={() => setDrilldownConfig(null)}
      />

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Informasi singkat</h2>
            <p className="text-sm text-zinc-500">
              Data ini diperbarui langsung dari endpoint backend yang sesuai.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-zinc-50 p-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Stethoscope className="h-4 w-4 text-cyan-600" />
              <span>Pasien aktif</span>
            </div>
            <p className="mt-2 text-xl font-semibold text-zinc-900">
              {status?.total_aktif ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Perhatian obat</span>
            </div>
            <p className="mt-2 text-xl font-semibold text-zinc-900">
              {(summary?.low_stock_count ?? 0) + (summary?.expiring_soon_count ?? 0)}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <CalendarClock className="h-4 w-4 text-emerald-600" />
              <span>Histori terbaru</span>
            </div>
            <p className="mt-2 text-xl font-semibold text-zinc-900">
              {histori.length + historiPengeluaran.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
