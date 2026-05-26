"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import {
  animateNumber,
  useAnimateProgress,
} from "@/lib/hooks/useAnimateProgress";

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  onDetailClick?: () => void;
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  onDetailClick,
}: StatCardProps) {
  const progress = useAnimateProgress(value, true, 800);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-800">
          {animateNumber(value, progress).toLocaleString("id-ID")}
        </p>
        <button
          type="button"
          onClick={onDetailClick}
          className="mt-3 flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          Detail
          <ChevronRight className="h-4 w-4" />
          <ChevronRight className="-ml-2 h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onDetailClick}
        className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-700 ${iconBg}`}
        style={{ transform: `scale(${0.7 + progress * 0.3})` }}
        aria-label={`Lihat detail ${label}`}
      >
        <Icon className={`h-7 w-7 ${iconColor}`} />
      </button>
    </div>
  );
}
