"use client";

import { Search } from "lucide-react";
import {
  DIAGNOSA_PERIODE_OPTIONS,
  type DiagnosaPeriode,
  type DiagnosaTerbanyakItem,
} from "@/lib/types/dashboard-pasien";
import {
  useAnimateProgress,
} from "@/lib/hooks/useAnimateProgress";
import { Skeleton } from "@/components/ui/Skeleton";

type DiagnosaBarChartProps = {
  data: DiagnosaTerbanyakItem[];
  periode: DiagnosaPeriode;
  onPeriodeChange: (p: DiagnosaPeriode) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onDiagnosaClick?: (item: DiagnosaTerbanyakItem) => void;
  loading?: boolean;
};

function BarChartBodySkeleton() {
  return (
    <div className="mt-6 space-y-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function DiagnosaBarChart({
  data,
  periode,
  onPeriodeChange,
  search,
  onSearchChange,
  onDiagnosaClick,
  loading,
}: DiagnosaBarChartProps) {
  const chartKey = `${periode}-${data.map((d) => d.kd_penyakit).join(",")}`;
  const progress = useAnimateProgress(
    chartKey,
    !loading && data.length > 0,
    950,
  );
  const maxPct = Math.max(...data.map((d) => d.persentase), 1);

  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-800">
          Diagnosa Terbanyak
        </h3>
        <div className="flex rounded-full bg-zinc-100 p-1 text-xs font-medium">
          {DIAGNOSA_PERIODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={loading}
              onClick={() => onPeriodeChange(opt.value)}
              className={`rounded-full px-4 py-1.5 transition-all duration-200 disabled:opacity-60 ${
                periode === opt.value
                  ? "bg-cyan-500 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari kode atau nama diagnosa…"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-black placeholder:text-zinc-400 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        />
      </div>

      {loading ? (
        <BarChartBodySkeleton />
      ) : data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-400">
          {search.trim()
            ? "Tidak ada diagnosa yang cocok dengan pencarian."
            : "Belum ada data diagnosa untuk periode ini."}
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {data.map((item, idx) => {
            const rowProgress = Math.min(
              1,
              Math.max(0, progress * data.length - idx * 0.2),
            );
            const barWidth = (item.persentase / maxPct) * 100 * rowProgress;

            const clickable = item.jumlah > 0 && !!onDiagnosaClick;

            return (
              <li
                key={item.kd_penyakit}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={() => clickable && onDiagnosaClick(item)}
                onKeyDown={(e) => {
                  if (
                    clickable &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    onDiagnosaClick(item);
                  }
                }}
                className={`rounded-lg transition-all ${
                  clickable
                    ? "cursor-pointer hover:bg-zinc-50 px-2 py-1 -mx-2"
                    : ""
                }`}
                style={{
                  opacity: rowProgress,
                  transform: `translateX(${(1 - rowProgress) * 12}px)`,
                }}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-zinc-700">
                    <span className="mr-1.5 font-mono text-xs text-zinc-400">
                      {item.kd_penyakit}
                    </span>
                    {item.nama_penyakit}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-500">
                    {(item.persentase * rowProgress).toFixed(2)}%
                    {clickable && (
                      <span className="ml-2 text-xs text-cyan-600">
                        · {item.jumlah} kasus
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full rounded-full ease-out transition-colors ${
                      idx === 0 ? "bg-cyan-500" : "bg-violet-300"
                    } ${clickable ? "group-hover:opacity-90" : ""}`}
                    style={{
                      width: `${barWidth}%`,
                      transition: "width 0.05s linear",
                    }}
                  />
                </div>
                {clickable && rowProgress > 0.8 && (
                  <p className="mt-1 text-xs text-cyan-600">
                    Klik untuk lihat daftar pasien
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
