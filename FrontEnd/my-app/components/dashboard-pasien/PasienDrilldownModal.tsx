"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchDrilldownPasien } from "@/lib/api/dashboard-pasien";
import type { DrilldownModalConfig } from "@/lib/drilldown";
import type { PasienBaris } from "@/lib/types/dashboard-pasien";
import { Skeleton } from "@/components/ui/Skeleton";

type PasienDrilldownModalProps = {
  config: DrilldownModalConfig | null;
  onClose: () => void;
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

export default function PasienDrilldownModal({
  config,
  onClose,
}: PasienDrilldownModalProps) {
  const [rows, setRows] = useState<PasienBaris[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (offset: number) => {
    if (!config) return;
    const append = offset > 0;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchDrilldownPasien({
        tipe: config.tipe,
        periode: config.periode,
        kategori: config.kategori,
        kd_penyakit: config.kd_penyakit,
        limit: 50,
        offset,
      });
      setTotal(res.total);
      setRows((prev) =>
        append ? [...prev, ...(res.data ?? [])] : (res.data ?? []),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
      if (!append) setRows([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [config]);

  useEffect(() => {
    if (!config) {
      setRows([]);
      setTotal(0);
      return;
    }
    load(0);
  }, [config?.tipe, config?.periode, config?.kategori, config?.kd_penyakit, config?.title, load]);

  useEffect(() => {
    if (!config) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config, onClose]);

  if (!config) return null;

  const hasMore = rows.length < total;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drilldown-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 id="drilldown-title" className="text-lg font-semibold text-zinc-900">
              {config.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{config.subtitle}</p>
            {!loading && (
              <p className="mt-1 text-xs text-zinc-400">
                Menampilkan {rows.length} dari {total.toLocaleString("id-ID")}{" "}
                pasien
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              Tidak ada data pasien.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-500">
                  <th className="pb-2 pr-3 font-medium">ID</th>
                  <th className="pb-2 pr-3 font-medium">Nama</th>
                  <th className="pb-2 pr-3 font-medium">Umur</th>
                  <th className="pb-2 pr-3 font-medium">Gender</th>
                  <th className="pb-2 pr-3 font-medium">Rawat</th>
                  <th className="pb-2 pr-3 font-medium">Diagnosa</th>
                  <th className="pb-2 font-medium">Penjamin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.id}-${row.no_rawat ?? ""}`}
                    className="border-b border-zinc-50 text-zinc-700"
                  >
                    <td className="py-2.5 pr-3 font-medium">{row.id}</td>
                    <td className="py-2.5 pr-3">{row.nama}</td>
                    <td className="py-2.5 pr-3">
                      {row.umur} th
                      <span className="block text-xs text-zinc-400">
                        {formatDate(row.tgl_lahir)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">{row.jenis_kelamin}</td>
                    <td className="py-2.5 pr-3">{row.rawat}</td>
                    <td
                      className="max-w-[180px] truncate py-2.5 pr-3"
                      title={row.diagnosa}
                    >
                      {row.diagnosa}
                    </td>
                    <td className="py-2.5">{row.penjamin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {hasMore && !loading && !error && (
          <div className="border-t border-zinc-100 px-6 py-3">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => load(rows.length)}
              className="w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {loadingMore ? "Memuat…" : "Muat lebih banyak"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
