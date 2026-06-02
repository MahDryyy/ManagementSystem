"use client";

import { Search } from "lucide-react";
import type {
  KeuanganPeriode,
  PendapatanAkunRow,
  TotalPerAkun,
} from "@/lib/types/dashboard-keuangan";
import { KEUANGAN_PERIODE_OPTIONS } from "@/lib/types/dashboard-keuangan";
import { formatRupiah } from "@/lib/format-currency";
import { AnimatedTableRow } from "@/components/ui/AnimatedTableRow";
import { Skeleton } from "@/components/ui/Skeleton";

type PendapatanTableProps = {
  rows: PendapatanAkunRow[];
  total: number;
  grandTotal: number;
  perAkun?: TotalPerAkun[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  periode: KeuanganPeriode;
  onPeriodeChange: (p: KeuanganPeriode) => void;
  filterJenis: "" | "ralan" | "ranap";
  onFilterJenisChange: (v: "" | "ralan" | "ranap") => void;
  onRowClick?: (row: PendapatanAkunRow) => void;
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

function jenisLabel(j: string) {
  return j === "ranap" ? "Rawat Inap" : "Rawat Jalan";
}

export default function PendapatanTable({
  rows,
  total,
  grandTotal,
  perAkun,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  search,
  onSearchChange,
  periode,
  onPeriodeChange,
  filterJenis,
  onFilterJenisChange,
  onRowClick,
}: PendapatanTableProps) {
  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-800">
            Pendapatan Per Akun Rekening
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Menampilkan {rows.length} dari {total.toLocaleString("id-ID")} baris
            · Total {formatRupiah(grandTotal)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari pasien, no rawat, nota…"
              className="w-full rounded-lg border border-zinc-200 py-2 pr-3 pl-9 text-sm text-black outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <select
            value={filterJenis}
            onChange={(e) =>
              onFilterJenisChange(e.target.value as "" | "ralan" | "ranap")
            }
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            <option value="">Semua jenis</option>
            <option value="ralan">Rawat Jalan</option>
            <option value="ranap">Rawat Inap</option>
          </select>
          <select
            value={periode}
            onChange={(e) => onPeriodeChange(e.target.value as KeuanganPeriode)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            {KEUANGAN_PERIODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {perAkun && perAkun.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {perAkun.map((a) => (
            <span
              key={a.akun_rekening}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600"
            >
              {a.akun_rekening}: {formatRupiah(a.total, true)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="pb-3 pr-3 font-medium">No</th>
              <th className="pb-3 pr-3 font-medium">Tanggal</th>
              <th className="pb-3 pr-3 font-medium">No. Rawat / Nota</th>
              <th className="pb-3 pr-3 font-medium">Nama Pasien</th>
              <th className="pb-3 pr-3 font-medium">Cara Bayar</th>
              <th className="pb-3 pr-3 font-medium">Akun Rekening</th>
              <th className="pb-3 pr-3 font-medium">Rincian</th>
              <th className="pb-3 text-right font-medium">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  <td colSpan={8} className="py-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-400">
                  Tidak ada data pendapatan.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <AnimatedTableRow
                  key={`${row.no_rawat}-${row.no_nota}-${row.akun_rekening}-${idx}`}
                  delayMs={idx * 35}
                  className={onRowClick ? "cursor-pointer hover:bg-zinc-50" : undefined}
                  onClick={() => onRowClick?.(row)}
                >
                  <td className="py-3 pr-3 text-zinc-500">{idx + 1}</td>
                  <td className="py-3 pr-3 text-zinc-700">
                    {formatDate(row.tanggal)}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="font-mono text-xs text-zinc-800">
                      {row.no_rawat}
                    </div>
                    <div className="text-xs text-zinc-500">{row.no_nota}</div>
                    <div className="text-[10px] text-cyan-600">
                      {jenisLabel(row.jenis_rawat)}
                    </div>
                  </td>
                  <td className="max-w-[180px] truncate py-3 pr-3 font-medium text-zinc-800">
                    {row.nm_pasien}
                  </td>
                  <td className="py-3 pr-3 text-zinc-600">{row.cara_bayar}</td>
                  <td className="py-3 pr-3 text-zinc-600">{row.akun_rekening}</td>
                  <td className="py-3 pr-3">
                    {row.rincian && row.rincian.length > 0 ? (
                      <div className="flex max-w-[320px] flex-wrap gap-1">
                        {row.rincian.slice(0, 6).map((r) => (
                          <span
                            key={r.kategori}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700"
                            title={`${r.kategori} · ${formatRupiah(r.total, true)}`}
                          >
                            {r.kategori}
                          </span>
                        ))}
                        {row.rincian.length > 6 && (
                          <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-500">
                            +{row.rincian.length - 6}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="py-3 text-right font-semibold tabular-nums text-emerald-700">
                    {formatRupiah(row.total)}
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
