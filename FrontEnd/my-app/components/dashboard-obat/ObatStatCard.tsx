"use client";

import type { LucideIcon } from "lucide-react";
import {
  animateNumber,
  useAnimateProgress,
} from "@/lib/hooks/useAnimateProgress";

type ObatStatCardProps = {
  label: string;
  value: number;
  subtitle?: string;
  subtitleClassName?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  valueClassName?: string;
};

export default function ObatStatCard({
  label,
  value,
  subtitle,
  subtitleClassName = "text-zinc-400",
  icon: Icon,
  iconBg,
  iconColor,
  valueClassName = "text-zinc-800",
}: ObatStatCardProps) {
  const progress = useAnimateProgress(value, true, 800);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-500">{label}</p>
        <p
          className={`mt-1 truncate text-2xl font-bold tabular-nums sm:text-3xl ${valueClassName}`}
        >
          {animateNumber(value, progress).toLocaleString("id-ID")}
        </p>
        {subtitle && (
          <p className={`mt-1 text-xs ${subtitleClassName}`}>{subtitle}</p>
        )}
      </div>
      <div
        className={`ml-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${iconBg}`}
        style={{ transform: `scale(${0.7 + progress * 0.3})` }}
      >
        <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${iconColor}`} />
      </div>
    </div>
  );
}
