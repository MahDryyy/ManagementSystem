"use client";

import { Search } from "lucide-react";
import type { DataBPJS, PenjaminFilter } from "@/lib/types/dashboard-pasien";
import { PENJAMIN_FILTER_OPTIONS } from "@/lib/types/dashboard-pasien";
import { AnimatedTableRow } from "@/components/ui/AnimatedTableRow";
import { Skeleton } from "@/components/ui/Skeleton";

type BPJSPoliTableProps = {
  rows: DataBPJS[];
  total: number;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  kdPoli: string;
  onKdPoliChange: (v: string) => void;
  filterPenjamin: PenjaminFilter;
  onFilterPenjaminChange: (v: PenjaminFilter) => void;
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

function statusBadge(status: string) {
  const s = status?.toLowerCase() ?? "";
  const cls =
    s === "belum"
      ? "bg-amber-50 text-amber-700"
      : s === "sudah"
        ? "bg-emerald-50 text-emerald-700"
        : s === "batal"
          ? "bg-rose-50 text-rose-700"
          : "bg-zinc-50 text-zinc-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status || "-"}
    </span>
  );
}

export default function BPJSPoliTable({
  rows,
  total,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  search,
  onSearchChange,
  kdPoli,
  onKdPoliChange,
  filterPenjamin,
  onFilterPenjaminChange,
}: BPJSPoliTableProps) {
  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-800">
            Data Pasien per Poli
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Menampilkan {rows.length} dari {total.toLocaleString("id-ID")} pasien
            berdasarkan poli yang dipilih.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[200px] sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari nama, no. RM, atau poli…"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-black placeholder:text-zinc-400 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <input
            type="text"
            value={kdPoli}
            onChange={(e) => onKdPoliChange(e.target.value)}
            placeholder="Kode poli (contoh: UGD)"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-cyan-300"
            aria-label="Filter kode poli"
          />
          <select
            value={filterPenjamin}
            onChange={(e) =>
              onFilterPenjaminChange(e.target.value as PenjaminFilter)
            }
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-cyan-300"
            aria-label="Filter penjamin"
          >
            {PENJAMIN_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || "all-bpjs-poli"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-zinc-500">
              <th className="pb-3 pr-4 font-medium">No. Rawat</th>
              <th className="pb-3 pr-4 font-medium">No. RM</th>
              <th className="pb-3 pr-4 font-medium">Nama Pasien</th>
              <th className="pb-3 pr-4 font-medium">Tgl Registrasi</th>
              <th className="pb-3 pr-4 font-medium">Poli</th>
              <th className="pb-3 pr-4 font-medium">Dokter</th>
              <th className="pb-3 pr-4 font-medium">Penjamin</th>
              <th className="pb-3 pr-4 font-medium">Status Lanjut</th>
              <th className="pb-3 font-medium">Status Rawat</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-50 last:border-0">
                  <td colSpan={9} className="py-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-zinc-400">
                  Tidak ada data pasien BPJS.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <AnimatedTableRow
                  key={`${row.no_rawat}-${row.no_rkm_medis}`}
                  delayMs={idx * 40}
                >
                  <td className="py-3 pr-4 font-mono text-xs text-cyan-800">
                    {row.no_rawat || "-"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs font-medium text-zinc-800">
                    {row.no_rkm_medis || "-"}
                  </td>
                  <td className="py-3 pr-4 font-medium text-zinc-800">
                    {row.nm_pasien || "-"}
                  </td>
                  <td className="py-3 pr-4">
                    {formatDate(row.tgl_registrasi)}
                    <span className="block text-xs text-zinc-400">
                      {row.jam_reg || "-"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">
                      {row.kd_poli}
                    </span>
                    <span className="ml-1.5">{row.nm_poli}</span>
                  </td>
                  <td className="py-3 pr-4">{row.nm_dokter || "-"}</td>
                  <td className="py-3 pr-4">{row.nm_penjamin || "-"}</td>
                  <td className="py-3 pr-4">
                    {row.status_lanjut === "Ranap"
                      ? "Rawat Inap"
                      : "Rawat Jalan"}
                  </td>
                  <td className="py-3">{statusBadge(row.status_rawat)}</td>
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
