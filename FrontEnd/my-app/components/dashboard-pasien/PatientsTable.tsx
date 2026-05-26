"use client";

import { Search } from "lucide-react";
import type { PasienBaris } from "@/lib/types/dashboard-pasien";
import { AnimatedTableRow } from "@/components/ui/AnimatedTableRow";
import { Skeleton } from "@/components/ui/Skeleton";

type PatientsTableProps = {
  rows: PasienBaris[];
  total: number;
  loading?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  filterId: string;
  onFilterIdChange: (v: string) => void;
  filterGender: string;
  onFilterGenderChange: (v: string) => void;
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
  search,
  onSearchChange,
  filterId,
  onFilterIdChange,
  filterGender,
  onFilterGenderChange,
}: PatientsTableProps) {
  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-800">Patients</h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Showing {rows.length} of {total.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari pasien…"
              className="w-48 rounded-lg border border-zinc-200 py-2 pr-3 pl-9 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <span className="text-sm text-zinc-500">Filter</span>
          <input
            type="text"
            value={filterId}
            onChange={(e) => onFilterIdChange(e.target.value)}
            placeholder="ID"
            className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-cyan-300"
          />
          <select
            value={filterGender}
            onChange={(e) => onFilterGenderChange(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-cyan-300"
          >
            <option value="">Gender</option>
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
    </div>
  );
}
