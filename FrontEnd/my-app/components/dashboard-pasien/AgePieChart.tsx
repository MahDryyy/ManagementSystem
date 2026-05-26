"use client";

import {
  KATEGORI_UMUR_PERIODE_OPTIONS,
  type KategoriUmurItem,
  type KategoriUmurPeriode,
} from "@/lib/types/dashboard-pasien";
import { PieChartSkeleton } from "@/components/dashboard-pasien/DashboardPasienSkeleton";
import {
  animateNumber,
  useAnimateProgress,
} from "@/lib/hooks/useAnimateProgress";
import { Skeleton } from "@/components/ui/Skeleton";

const COLORS = ["#00B8D9", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899"];
const CX = 90;
const CY = 90;
const R = 70;

type AgePieChartProps = {
  data: KategoriUmurItem[];
  periode: KategoriUmurPeriode;
  onPeriodeChange: (p: KategoriUmurPeriode) => void;
  onKategoriClick?: (kategori: string, jumlah: number) => void;
  loading?: boolean;
};

function pieSlices(items: KategoriUmurItem[], progress: number) {
  const total = items.reduce((s, i) => s + i.jumlah, 0) || 1;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const maxEnd = -90 + 360 * progress;

  let slotStart = -90;

  return items.map((item, idx) => {
    const fullSweep = (item.jumlah / total) * 360;
    const slotEnd = slotStart + fullSweep;
    const drawEnd = Math.min(slotEnd, maxEnd);
    const sweep = drawEnd - slotStart;
    const large = sweep > 180 ? 1 : 0;

    slotStart = slotEnd;

    if (item.jumlah === 0 || sweep < 0.01) {
      return { d: "", color: COLORS[idx % COLORS.length], item, idx };
    }

    const x1 = CX + R * Math.cos(toRad(drawEnd - sweep));
    const y1 = CY + R * Math.sin(toRad(drawEnd - sweep));
    const x2 = CX + R * Math.cos(toRad(drawEnd));
    const y2 = CY + R * Math.sin(toRad(drawEnd));
    const d = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;

    return { d, color: COLORS[idx % COLORS.length], item, idx };
  });
}

function PieChartBodySkeleton() {
  return (
    <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <Skeleton className="h-[180px] w-[180px] shrink-0 rounded-full" />
      <div className="w-full flex-1 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AgePieChart({
  data,
  periode,
  onPeriodeChange,
  onKategoriClick,
  loading,
}: AgePieChartProps) {
  const chartKey = `${periode}-${data.map((d) => d.jumlah).join(",")}`;
  const progress = useAnimateProgress(chartKey, !loading && data.length > 0, 1000);

  if (loading && data.length === 0) {
    return <PieChartSkeleton />;
  }

  const slices = pieSlices(data, progress);
  const hasData = data.some((d) => d.jumlah > 0);

  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-800">
          Kategori Umur Pasien
        </h3>
        <div className="flex rounded-full bg-zinc-100 p-1 text-xs font-medium">
          {KATEGORI_UMUR_PERIODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={loading}
              onClick={() => onPeriodeChange(opt.value)}
              className={`rounded-full px-3 py-1.5 transition-all duration-200 sm:px-4 disabled:opacity-60 ${
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

      {loading ? (
        <PieChartBodySkeleton />
      ) : (
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div
            className="relative shrink-0 transition-transform duration-300"
            style={{
              transform: `scale(${0.92 + progress * 0.08})`,
              opacity: 0.4 + progress * 0.6,
            }}
          >
            <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden>
              <circle
                cx={CX}
                cy={CY}
                r={R}
                fill="#f4f4f5"
                stroke="#e4e4e7"
                strokeWidth="1"
              />
              {hasData &&
                slices.map(
                  (s) =>
                    s.d && (
                      <path
                        key={s.item.kategori}
                        d={s.d}
                        fill={s.color}
                        stroke="#fff"
                        strokeWidth="2"
                        className={
                          s.item.jumlah > 0 && onKategoriClick
                            ? "cursor-pointer hover:opacity-80"
                            : ""
                        }
                        style={{ opacity: 0.85 + progress * 0.15 }}
                        onClick={() =>
                          s.item.jumlah > 0 &&
                          onKategoriClick?.(s.item.kategori, s.item.jumlah)
                        }
                      />
                    ),
                )}
            </svg>
          </div>

          <ul className="flex flex-1 flex-col gap-2 text-sm">
            {data.map((item, idx) => {
              const sliceProgress = Math.min(
                1,
                Math.max(0, progress * data.length - idx * 0.15),
              );
              return (
                <li
                  key={item.kategori}
                  role={item.jumlah > 0 && onKategoriClick ? "button" : undefined}
                  tabIndex={item.jumlah > 0 && onKategoriClick ? 0 : undefined}
                  onClick={() =>
                    item.jumlah > 0 &&
                    onKategoriClick?.(item.kategori, item.jumlah)
                  }
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Enter" || e.key === " ") &&
                      item.jumlah > 0
                    ) {
                      e.preventDefault();
                      onKategoriClick?.(item.kategori, item.jumlah);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-lg transition-all duration-300 ${
                    item.jumlah > 0 && onKategoriClick
                      ? "cursor-pointer hover:bg-zinc-50 px-1 py-0.5 -mx-1"
                      : ""
                  }`}
                  style={{
                    opacity: sliceProgress,
                    transform: `translateX(${(1 - sliceProgress) * 8}px)`,
                  }}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full transition-transform duration-500"
                    style={{
                      backgroundColor: COLORS[idx % COLORS.length],
                      transform: `scale(${0.5 + sliceProgress * 0.5})`,
                    }}
                  />
                  <span className="flex-1 text-zinc-600">{item.kategori}</span>
                  <span className="font-semibold tabular-nums text-zinc-800">
                    {animateNumber(item.jumlah, sliceProgress)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
