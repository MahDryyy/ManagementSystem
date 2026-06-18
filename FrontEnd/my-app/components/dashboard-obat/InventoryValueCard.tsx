"use client";

import { DollarSign } from "lucide-react";
import {
  animateNumber,
  useAnimateProgress,
} from "@/lib/hooks/useAnimateProgress";

type InventoryValueCardProps = {
  value: number;
};

export default function InventoryValueCard({ value }: InventoryValueCardProps) {
  const progress = useAnimateProgress(value, true, 800);
  const display = animateNumber(value, progress);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-500">Nilai Inventory</p>
        <p className="mt-1 truncate text-xl font-bold tabular-nums text-zinc-800 sm:text-2xl">
          Rp{display.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-xs text-zinc-400">Total stok × harga beli</p>
      </div>
      <div
        className="ml-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 sm:h-14 sm:w-14"
        style={{ transform: `scale(${0.7 + progress * 0.3})` }}
      >
        <DollarSign className="h-6 w-6 text-emerald-500 sm:h-7 sm:w-7" />
      </div>
    </div>
  );
}
