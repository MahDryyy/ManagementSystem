"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Boxes,
  Calendar,
  DollarSign,
  Package,
  X,
} from "lucide-react";
import { fetchDashboardObat } from "@/lib/api/dashboard-obat";
import type {
  DashboardDistribution,
  DashboardRecentActivity,
  DashboardStockMovement,
  DashboardSummary,
} from "@/lib/types/dashboard-obat";
import DashboardObatSkeleton from "@/components/dashboard-obat/DashboardObatSkeleton";
import GolonganPieChart from "@/components/dashboard-obat/GolonganPieChart";
import InventoryValueCard from "@/components/dashboard-obat/InventoryValueCard";
import ObatStatCard from "@/components/dashboard-obat/ObatStatCard";
import RecentActivities from "@/components/dashboard-obat/RecentActivities";
import StockMovementChart from "@/components/dashboard-obat/StockMovementChart";
import FadeIn from "@/components/ui/FadeIn";

const notifications = [
  {
    id: 1,
    type: "expired" as const,
    title: "Barang Sudah Expired!",
    message:
      "Omeprazole 20mg Batch B2023-012 sudah expired sejak 10/05/2026 - Segera tarik dari inventory!",
    time: "2 menit lalu",
    read: false,
  },
  {
    id: 2,
    type: "stock" as const,
    title: "Stok Minimum Tercapai",
    message: "Paracetamol 500mg hanya tersisa 20 strip (min: 50)",
    time: "5 menit lalu",
    read: false,
  },
  {
    id: 3,
    type: "expired" as const,
    title: "Barang Mendekati Expired",
    message: "Vitamin B Complex akan expired dalam 17 hari (30/05/2026)",
    time: "15 menit lalu",
    read: false,
  },
  {
    id: 4,
    type: "stock" as const,
    title: "Stok Kritis",
    message: "Betadine Solution tersisa 15 botol (min: 50)",
    time: "30 menit lalu",
    read: false,
  },
];

function NotificationIcon({ type }: { type: "expired" | "stock" | "price" }) {
  if (type === "stock") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      </div>
    );
  }
  if (type === "expired") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50">
        <Calendar className="h-4 w-4 text-rose-500" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
      <DollarSign className="h-4 w-4 text-cyan-500" />
    </div>
  );
}

export default function DashboardObat() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [distribution, setDistribution] = useState<DashboardDistribution[]>([]);
  const [stockMovement, setStockMovement] = useState<DashboardStockMovement[]>(
    [],
  );
  const [recentActivities, setRecentActivities] = useState<
    DashboardRecentActivity[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardObat();
      setSummary(data.summary);
      setDistribution(data.golongan_distribution ?? []);
      setStockMovement(data.stock_movement ?? []);
      setRecentActivities(data.recent_activities ?? []);
    } catch (e) {
      setSummary(null);
      setDistribution([]);
      setStockMovement([]);
      setRecentActivities([]);
      setError(
        e instanceof Error ? e.message : "Gagal memuat dashboard dari server",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <DashboardObatSkeleton />;
  }

  if (error || !summary) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-12">
        <p className="text-sm text-red-600">
          {error ?? "Data tidak tersedia"}
        </p>
        <p className="max-w-md text-center text-xs text-zinc-500">
          Pastikan backend Go berjalan di{" "}
          <code className="rounded bg-zinc-100 px-1">localhost:8080</code> dan
          database terhubung.
        </p>
        <button
          type="button"
          onClick={loadDashboard}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-8">
      <FadeIn className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard Obat</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ringkasan inventory Ampelgading Medical Centre
          </p>
        </div>

        <div className="relative shrink-0">

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
                aria-hidden
              />
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[#e8eaed] bg-white shadow-xl sm:w-96">
                <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-800">
                      Notifikasi
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {unreadCount} belum dibaca
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="rounded-lg p-1 hover:bg-zinc-100"
                  >
                    <X className="h-4 w-4 text-zinc-500" />
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`border-b border-zinc-50 px-4 py-3 last:border-0 ${
                        !notif.read ? "bg-zinc-50/80" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <NotificationIcon type={notif.type} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-800">
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                            {notif.message}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-400">
                            {notif.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FadeIn delayMs={80}>
          <ObatStatCard
            label="Total Jenis Barang"
            value={summary.total_items}
            subtitle="Item terdaftar di databarang"
            icon={Boxes}
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
          />
        </FadeIn>
        <FadeIn delayMs={120}>
          <ObatStatCard
            label="Total Stok Barang"
            value={summary.total_stock}
            subtitle="Seluruh gudang apotek"
            icon={Package}
            iconBg="bg-cyan-50"
            iconColor="text-cyan-500"
          />
        </FadeIn>
        <FadeIn delayMs={160}>
          <InventoryValueCard value={summary.inventory_value} />
        </FadeIn>
        <FadeIn delayMs={200}>
          <ObatStatCard
            label="Stok Hampir Habis"
            value={summary.low_stock_count}
            subtitle="Stok ≤ 50 unit"
            subtitleClassName="text-amber-500"
            icon={AlertTriangle}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            valueClassName="text-amber-600"
          />
        </FadeIn>
        <FadeIn delayMs={240}>
          <ObatStatCard
            label="Obat Sudah Expired"
            value={summary.expired_count}
            subtitle="Perlu segera dimusnahkan"
            subtitleClassName="text-rose-500"
            icon={Calendar}
            iconBg="bg-rose-50"
            iconColor="text-rose-500"
            valueClassName="text-rose-600"
          />
        </FadeIn>
        <FadeIn delayMs={280}>
          <ObatStatCard
            label="Mendekati Expired"
            value={summary.expiring_soon_count}
            subtitle="Dalam 30 hari ke depan"
            subtitleClassName="text-orange-500"
            icon={Calendar}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            valueClassName="text-orange-600"
          />
        </FadeIn>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <FadeIn delayMs={320}>
          <StockMovementChart data={stockMovement} />
        </FadeIn>
        <FadeIn delayMs={360}>
          <GolonganPieChart data={distribution} />
        </FadeIn>
      </div>

      <FadeIn delayMs={400} className="mt-6">
        <RecentActivities activities={recentActivities} />
      </FadeIn>
    </div>
  );
}
