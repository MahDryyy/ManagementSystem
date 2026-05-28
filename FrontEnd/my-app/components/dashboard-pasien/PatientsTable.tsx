"use client";

import { Search } from "lucide-react";
import type { PasienBaris, PenjaminFilter } from "@/lib/types/dashboard-pasien";
import { PENJAMIN_FILTER_OPTIONS } from "@/lib/types/dashboard-pasien";
import { AnimatedTableRow } from "@/components/ui/AnimatedTableRow";
import { Skeleton } from "@/components/ui/Skeleton";

type PatientsTableProps = {
  rows: PasienBaris[];
  total: number;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  filterGender: string;
  onFilterGenderChange: (v: string) => void;
  filterPenjamin: PenjaminFilter;
  onFilterPenjaminChange: (v: PenjaminFilter) => void;
  onRowClick?: (row: PasienBaris) => void;
};

function formatDate(iso: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function PatientsTable({
  rows,
  total,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  search,
  onSearchChange,
  filterGender,
  onFilterGenderChange,
  filterPenjamin,
  onFilterPenjaminChange,
  onRowClick,
}: PatientsTableProps) {
  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-800">Daftar Pasien</h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Menampilkan {rows.length} dari {total.toLocaleString("id-ID")}
            {onRowClick ? " · Klik baris untuk detail" : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[200px] sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari nama, ID, alamat…"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-black placeholder:text-zinc-400 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <select
            value={filterPenjamin}
            onChange={(e) =>
              onFilterPenjaminChange(e.target.value as PenjaminFilter)
            }
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-cyan-300"
            aria-label="Filter penjamin"
          >
            {PENJAMIN_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={filterGender}
            onChange={(e) => onFilterGenderChange(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-cyan-300"
            aria-label="Filter jenis kelamin"
          >
            <option value="">Semua gender</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-zinc-500">
              <th className="pb-3 pr-4 font-medium">ID</th>
              <th className="pb-3 pr-4 font-medium">Nama</th>
              <th className="pb-3 pr-4 font-medium">Telepon</th>
              <th className="pb-3 pr-4 font-medium">Diagnosa</th>
              <th className="pb-3 pr-4 font-medium">Umur</th>
              <th className="pb-3 pr-4 font-medium">Gender</th>
              <th className="pb-3 pr-4 font-medium">Rawat</th>
              <th className="pb-3 font-medium">Penjamin</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-50 last:border-0">
                  <td colSpan={8} className="py-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-zinc-400">
                  Tidak ada data pasien.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <AnimatedTableRow
                  key={`${row.id}-${row.no_rawat ?? ""}`}
                  delayMs={idx * 40}
                  className={onRowClick ? "cursor-pointer hover:bg-cyan-50/40" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  <td className="py-3 pr-4 font-medium text-zinc-800">
                    {row.id}
                  </td>
                  <td className="py-3 pr-4">{row.nama}</td>
                  <td className="py-3 pr-4">{row.no_telepon || "-"}</td>
                  <td
                    className="max-w-[200px] truncate py-3 pr-4"
                    title={row.diagnosa}
                  >
                    {row.diagnosa}
                  </td>
                  <td className="py-3 pr-4">
                    {row.umur} th
                    <span className="block text-xs text-zinc-400">
                      {formatDate(row.tgl_lahir)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{row.jenis_kelamin}</td>
                  <td className="py-3 pr-4">{row.rawat}</td>
                  <td className="py-3">{row.penjamin}</td>
                </AnimatedTableRow>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && !loading && onLoadMore ? (
        <div className="mt-4 border-t border-zinc-100 pt-4">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="w-full rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {loadingMore ? "Memuat…" : "Muat lebih banyak"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
