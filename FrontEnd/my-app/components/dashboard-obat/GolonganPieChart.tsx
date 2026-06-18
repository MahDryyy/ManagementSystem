"use client";

import {
  animateNumber,
  useAnimateProgress,
} from "@/lib/hooks/useAnimateProgress";
import type { DashboardDistribution } from "@/lib/types/dashboard-obat";

const COLORS = ["#00B8D9", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"];
const CX = 90;
const CY = 90;
const R = 70;

type GolonganPieChartProps = {
  data: DashboardDistribution[];
};

function pieSlices(items: DashboardDistribution[], progress: number) {
  const total = items.reduce((s, i) => s + Number(i.total_stock), 0) || 1;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const maxEnd = -90 + 360 * progress;

  let slotStart = -90;

  return items.map((item, idx) => {
    const fullSweep = (Number(item.total_stock) / total) * 360;
    const slotEnd = slotStart + fullSweep;
    const drawEnd = Math.min(slotEnd, maxEnd);
    const sweep = drawEnd - slotStart;
    const large = sweep > 180 ? 1 : 0;

    slotStart = slotEnd;

    if (Number(item.total_stock) === 0 || sweep < 0.01) {
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

export default function GolonganPieChart({ data }: GolonganPieChartProps) {
  const chartKey = data.map((d) => `${d.label}-${d.total_stock}`).join(",");
  const progress = useAnimateProgress(chartKey, data.length > 0, 1000);
  const slices = pieSlices(data, progress);
  const hasData = data.some((d) => Number(d.total_stock) > 0);

  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-zinc-800">
          Distribusi Golongan Barang
        </h3>
        <p className="mt-0.5 text-sm text-zinc-500">Berdasarkan total stok</p>
      </div>

      {hasData ? (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
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
              {slices.map(
                (s) =>
                  s.d && (
                    <path
                      key={s.item.label}
                      d={s.d}
                      fill={s.color}
                      stroke="#fff"
                      strokeWidth="2"
                      style={{ opacity: 0.85 + progress * 0.15 }}
                    />
                  ),
              )}
            </svg>
          </div>

          <ul className="flex w-full flex-1 flex-col gap-2 text-sm">
            {data.map((item, idx) => {
              const sliceProgress = Math.min(
                1,
                Math.max(0, progress * data.length - idx * 0.15),
              );
              const pct =
                data.reduce((s, i) => s + Number(i.total_stock), 0) > 0
                  ? (
                      (Number(item.total_stock) /
                        data.reduce((s, i) => s + Number(i.total_stock), 0)) *
                      100
                    ).toFixed(1)
                  : "0";

              return (
                <li
                  key={item.label}
                  className="flex items-center gap-2 rounded-lg px-1 py-0.5"
                  style={{
                    opacity: sliceProgress,
                    transform: `translateX(${(1 - sliceProgress) * 8}px)`,
                  }}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: COLORS[idx % COLORS.length],
                      transform: `scale(${0.5 + sliceProgress * 0.5})`,
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-zinc-600">
                    {item.label}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-zinc-800">
                    {animateNumber(Number(item.total_stock), sliceProgress).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-400">
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-400">
          Belum ada data distribusi golongan barang
        </div>
      )}
    </div>
  );
}
