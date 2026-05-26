"use client";

import type { StatusPerawatan } from "@/lib/types/dashboard-pasien";
import {
  animateNumber,
  useAnimateProgress,
} from "@/lib/hooks/useAnimateProgress";

type StatusPerawatanCardProps = {
  data: StatusPerawatan;
};

function MiniStat({
  label,
  value,
  subtext,
  progress,
}: {
  label: string;
  value: number;
  subtext: string;
  progress: number;
}) {
  return (
    <div
      className="rounded-xl border border-[#e8eaed] bg-[#f4f7f6] p-5 transition-transform duration-500"
      style={{
        transform: `scale(${0.96 + progress * 0.04})`,
        opacity: 0.5 + progress * 0.5,
      }}
    >
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-zinc-900">
        {animateNumber(value, progress)}
      </p>
      <p className="mt-2 text-xs text-zinc-400">{subtext}</p>
    </div>
  );
}

export default function StatusPerawatanCard({ data }: StatusPerawatanCardProps) {
  const chartKey = `${data.total_aktif}-${data.rawat_inap_aktif}-${data.rawat_jalan_aktif}`;
  const progress = useAnimateProgress(chartKey, true, 850);

  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">
          Status Perawatan
        </h3>
        <span className="text-sm text-zinc-500">
          Total{" "}
          <span className="font-bold tabular-nums text-zinc-900">
            {animateNumber(data.total_aktif, progress)}
          </span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <MiniStat
          label="Inap"
          value={data.rawat_inap_aktif}
          subtext="total pasien rawat inap"
          progress={Math.min(1, progress * 1.2)}
        />
        <MiniStat
          label="Jalan"
          value={data.rawat_jalan_aktif}
          subtext="total pasien rawat jalan"
          progress={Math.min(1, Math.max(0, progress * 1.2 - 0.15))}
        />
      </div>
    </div>
  );
}
