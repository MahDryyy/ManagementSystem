"use client";

import type { GrafikGranularity, GrafikTitik } from "@/lib/types/dashboard-keuangan";
import { GRAFIK_GRANULARITY_OPTIONS } from "@/lib/types/dashboard-keuangan";
import FinanceChart from "@/components/dashboard-keuangan/FinanceChart";
import { Skeleton } from "@/components/ui/Skeleton";

type LineChartCardProps = {
  title: string;
  data: GrafikTitik[];
  color: string;
  seriesName: string;
  granularity: GrafikGranularity;
  onGranularityChange: (g: GrafikGranularity) => void;
  loading?: boolean;
  subtitle?: string;
};

export default function LineChartCard({
  title,
  data,
  color,
  seriesName,
  granularity,
  onGranularityChange,
  loading,
  subtitle,
}: LineChartCardProps) {
  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
          )}
        </div>
        <div className="flex rounded-full bg-zinc-100 p-0.5 text-[10px] font-medium uppercase tracking-wide">
          {GRAFIK_GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={loading}
              onClick={() => onGranularityChange(opt.value)}
              className={`rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 ${
                granularity === opt.value
                  ? "bg-white text-zinc-800 shadow-sm"
                  : "text-zinc-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-[280px] w-full rounded-xl" />
      ) : (
        <div className="mt-4">
          <FinanceChart
            labels={data.map((d) => d.label)}
            series={[
              {
                id: "main",
                name: seriesName,
                color,
                values: data.map((d) => d.nilai),
                fillGradient: true,
              },
            ]}
            height={280}
            emptyMessage="Belum ada data untuk periode ini."
          />
        </div>
      )}
    </div>
  );
}
