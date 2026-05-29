"use client";

import type { PemasukanKategoriItem } from "@/lib/types/dashboard-keuangan";
import { formatRupiah } from "@/lib/format-currency";
import {
  animateNumber,
  useAnimateProgress,
} from "@/lib/hooks/useAnimateProgress";
import { Skeleton } from "@/components/ui/Skeleton";

const COLORS = ["#60a5fa", "#94a3b8", "#1e293b", "#3b82f6"];

type PemasukanDonutProps = {
  ringkasan: { harian: number; mingguan: number; bulanan: number };
  kategori: PemasukanKategoriItem[];
  loading?: boolean;
};

export default function PemasukanDonut({
  ringkasan,
  kategori,
  loading,
}: PemasukanDonutProps) {
  const chartKey = `${kategori.map((k) => `${k.kategori}:${k.persen}`).join("|")}|${ringkasan.bulanan}`;
  const progress = useAnimateProgress(chartKey, !loading, 900);

  let gradient = "conic-gradient(#e4e4e7 0deg 360deg)";
  if (kategori.length > 0) {
    let acc = 0;
    const stops: string[] = [];
    const sweep = 360 * progress;
    kategori.forEach((item, i) => {
      const fullDeg = (item.persen / 100) * 360;
      const deg = Math.min(fullDeg, Math.max(0, sweep - acc));
      const color = COLORS[i % COLORS.length];
      if (deg > 0) {
        stops.push(`${color} ${acc}deg ${acc + deg}deg`);
      }
      acc += fullDeg;
    });
    if (stops.length > 0) {
      gradient = `conic-gradient(${stops.join(", ")}, #e4e4e7 ${sweep}deg 360deg)`;
    }
  }

  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-base font-semibold text-zinc-800">Pemasukan</h3>
      <p className="mt-0.5 text-xs text-zinc-400">
        Pengeluaran akan ditambahkan nanti
      </p>

      {loading ? (
        <Skeleton className="mt-6 h-40 w-full rounded-xl" />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Daily", ringkasan.harian],
                ["Weekly", ringkasan.mingguan],
                ["Monthly", ringkasan.bulanan],
              ] as const
            ).map(([label, val], i) => (
              <div
                key={label}
                style={{
                  opacity: Math.min(1, progress * 3 - i * 0.3),
                  transform: `translateY(${(1 - Math.min(1, progress * 3 - i * 0.3)) * 6}px)`,
                  transition: "opacity 0.3s ease, transform 0.3s ease",
                }}
              >
                <p className="text-[10px] uppercase text-zinc-400">{label}</p>
                <p className="text-sm font-semibold text-zinc-800">
                  {formatRupiah(animateNumber(val, progress), true)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div
              className="relative h-36 w-36 shrink-0 rounded-full ease-out"
              style={{
                background: gradient,
                transform: `scale(${0.88 + progress * 0.12})`,
                transition: "transform 0.05s linear",
              }}
            >
              <div className="absolute inset-5 rounded-full bg-white" />
            </div>
            <ul className="flex-1 space-y-2 text-sm">
              {kategori.length === 0 ? (
                <li className="text-zinc-400">Belum ada data kategori.</li>
              ) : (
                kategori.map((item, i) => {
                  const rowProgress = Math.min(
                    1,
                    Math.max(0, progress * kategori.length - i * 0.35),
                  );
                  return (
                    <li
                      key={item.kategori}
                      className="flex items-center gap-2"
                      style={{
                        opacity: rowProgress,
                        transform: `translateX(${(1 - rowProgress) * 10}px)`,
                        transition: "opacity 0.2s ease, transform 0.2s ease",
                      }}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="flex-1 text-zinc-600">
                        {item.kategori}
                      </span>
                      <span className="tabular-nums text-zinc-500">
                        {(item.persen * rowProgress).toFixed(0)}%
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
