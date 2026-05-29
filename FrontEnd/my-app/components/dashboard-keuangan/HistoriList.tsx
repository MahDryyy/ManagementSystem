"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { HistoriItem } from "@/lib/types/dashboard-keuangan";
import { formatRupiah } from "@/lib/format-currency";
import { useAnimateProgress } from "@/lib/hooks/useAnimateProgress";
import { Skeleton } from "@/components/ui/Skeleton";

type HistoriListProps = {
  items: HistoriItem[];
  loading?: boolean;
  onViewAll?: () => void;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function HistoriList({
  items,
  loading,
  onViewAll,
}: HistoriListProps) {
  const listKey = items.map((i) => i.id).join("|");
  const progress = useAnimateProgress(listKey, !loading && items.length > 0, 850);

  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-800">
          Histori Transaksi
        </h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-cyan-600 hover:underline"
          >
            View all
          </button>
        )}
      </div>

      {loading ? (
        <ul className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={`hist-skel-${i}`}>
              <Skeleton className="h-12 w-full rounded-lg" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-zinc-400">
          Belum ada transaksi.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100">
          {items.map((item, index) => {
            const isIncome = item.jenis === "pemasukan";
            const rowProgress = Math.min(
              1,
              Math.max(0, progress * items.length - index * 0.35),
            );
            return (
              <li
                key={`${item.id}-${index}`}
                className="flex items-center gap-3 py-3 first:pt-0"
                style={{
                  opacity: rowProgress,
                  transform: `translateX(${(1 - rowProgress) * 16}px)`,
                  transition: "opacity 0.25s ease, transform 0.25s ease",
                }}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isIncome
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  {isIncome ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">
                    {item.judul}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {formatDate(item.tanggal)}
                    {item.kategori ? ` · ${item.kategori}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    isIncome ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatRupiah(item.nominal, true)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
