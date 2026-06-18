"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { DashboardRecentActivity } from "@/lib/types/dashboard-obat";

type RecentActivitiesProps = {
  activities: DashboardRecentActivity[];
};

function formatDateTime(activity: DashboardRecentActivity) {
  if (!activity.activity_date) return "-";

  const date = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${activity.activity_date}T00:00:00`));

  return activity.activity_time ? `${date} · ${activity.activity_time}` : date;
}

export default function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaed] bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h3 className="text-base font-semibold text-zinc-800">
          Aktivitas Transaksi Terbaru
        </h3>
        <p className="mt-0.5 text-sm text-zinc-500">
          Riwayat barang masuk dan keluar terakhir
        </p>
      </div>

      {activities.length > 0 ? (
        <div className="divide-y divide-zinc-100">
          {activities.map((activity, index) => {
            const isMasuk = activity.type === "masuk";

            return (
              <div
                key={`${activity.type}-${activity.reference_no}-${activity.kode_brng}-${index}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isMasuk ? "bg-emerald-50" : "bg-cyan-50"
                    }`}
                  >
                    {isMasuk ? (
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-cyan-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-800">
                      {activity.nama_brng}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {isMasuk ? "Barang Masuk" : "Barang Keluar"}
                      {" · "}
                      {activity.qty.toLocaleString("id-ID")} unit
                      {activity.reference_no && (
                        <span className="hidden sm:inline">
                          {" · "}
                          Ref: {activity.reference_no}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-zinc-400 sm:text-sm">
                  {formatDateTime(activity)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-zinc-400">
          Belum ada aktivitas transaksi dari database
        </div>
      )}
    </div>
  );
}
