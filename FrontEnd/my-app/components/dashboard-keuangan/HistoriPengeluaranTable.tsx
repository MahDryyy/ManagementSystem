"use client";

import { Search } from "lucide-react";
import type {
  HistoriPengeluaranRow,
  KeuanganPeriode,
  KategoriPengeluaranItem,
} from "@/lib/types/dashboard-keuangan";
import { KEUANGAN_PERIODE_OPTIONS } from "@/lib/types/dashboard-keuangan";
import { formatRupiah } from "@/lib/format-currency";
import { AnimatedTableRow } from "@/components/ui/AnimatedTableRow";
import { Skeleton } from "@/components/ui/Skeleton";

type HistoriPengeluaranTableProps = {
  rows: HistoriPengeluaranRow[];
  total: number;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  periode: KeuanganPeriode;
  onPeriodeChange: (p: KeuanganPeriode) => void;
  filterKategori: string;
  onFilterKategoriChange: (v: string) => void;
  kategoriOptions: KategoriPengeluaranItem[];
};

function formatDate(iso: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function HistoriPengeluaranTable({
  rows,
  total,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  search,
  onSearchChange,
  periode,
  onPeriodeChange,
  filterKategori,
  onFilterKategoriChange,
  kategoriOptions,
}: HistoriPengeluaranTableProps) {
  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-800">
            Histori Pengeluaran
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Menampilkan {rows.length} dari {total.toLocaleString("id-ID")} baris
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari no keluar, keterangan…"
              className="w-full rounded-lg border border-zinc-200 py-2 pr-3 pl-9 text-sm text-black outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <select
            value={filterKategori}
            onChange={(e) => onFilterKategoriChange(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-cyan-300"
            aria-label="Filter kategori"
          >
            <option value="">Semua kategori</option>
            {kategoriOptions.map((k) => (
              <option key={k.kode || k.nama} value={k.nama}>
                {k.nama}
              </option>
            ))}
          </select>
          <select
            value={periode}
            onChange={(e) => onPeriodeChange(e.target.value as KeuanganPeriode)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-cyan-300"
            aria-label="Filter periode"
          >
            {KEUANGAN_PERIODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="pb-3 pr-3 font-medium">No</th>
              <th className="pb-3 pr-3 font-medium">Tanggal</th>
              <th className="pb-3 pr-3 font-medium">Kategori</th>
              <th className="pb-3 pr-3 font-medium">Keterangan</th>
              <th className="pb-3 text-right font-medium">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-peng-${i}`}>
                  <td colSpan={5} className="py-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-400">
                  Tidak ada data pengeluaran.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <AnimatedTableRow
                  key={`${row.no_keluar}-${idx}`}
                  delayMs={idx * 35}
                >
                  <td className="py-3 pr-3 text-zinc-500">{idx + 1}</td>
                  <td className="py-3 pr-3 text-zinc-700">
                    {formatDate(row.tanggal)}
                  </td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800">
                      {row.kategori || "-"}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate py-3 pr-3 text-zinc-800">
                    {row.keterangan || "-"}
                  </td>
                  <td className="py-3 text-right font-semibold tabular-nums text-red-600">
                    {formatRupiah(row.biaya)}
                  </td>
                </AnimatedTableRow>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && onLoadMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {loadingMore ? "Memuat…" : "Muat lebih banyak"}
          </button>
        </div>
      )}
    </div>
  );
}
