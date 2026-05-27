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

function PasienRowCard({
  row,
  showRuangan,
}: {
  row: PasienBaris;
  showRuangan?: boolean;
}) {
  return (
    <article className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900">{row.nama}</p>
          <p className="mt-0.5 text-xs font-medium text-cyan-700">{row.id}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
          {row.rawat}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
            Umur
          </dt>
          <dd className="mt-0.5 text-zinc-800">
            {row.umur} th
            <span className="block text-xs text-zinc-500">
              {formatDate(row.tgl_lahir)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
            Gender
          </dt>
          <dd className="mt-0.5 text-zinc-800">{row.jenis_kelamin}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
            Diagnosa
          </dt>
          <dd className="mt-0.5 break-words text-zinc-800">{row.diagnosa || "-"}</dd>
        </div>
        {showRuangan && row.ruangan ? (
          <div className="col-span-2">
            <dt className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
              Ruangan
            </dt>
            <dd className="mt-0.5 break-words font-medium text-cyan-800">
              {row.ruangan}
            </dd>
          </div>
        ) : null}
        <div className="col-span-2">
          <dt className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
            Penjamin
          </dt>
          <dd className="mt-0.5 break-words text-zinc-800">{row.penjamin || "-"}</dd>
        </div>
      </dl>
    </article>
  );
}

function PasienRowTable({
  row,
  showRuangan,
}: {
  row: PasienBaris;
  showRuangan?: boolean;
}) {
  return (
    <tr className="border-b border-zinc-50 text-zinc-700">
      <td className="py-2.5 pr-3 font-medium whitespace-nowrap">{row.id}</td>
      <td className="py-2.5 pr-3">{row.nama}</td>
      <td className="py-2.5 pr-3 whitespace-nowrap">
        {row.umur} th
        <span className="block text-xs text-zinc-400">{formatDate(row.tgl_lahir)}</span>
      </td>
      <td className="py-2.5 pr-3">{row.jenis_kelamin}</td>
      <td className="py-2.5 pr-3">{row.rawat}</td>
      {showRuangan ? (
        <td className="max-w-[200px] py-2.5 pr-3" title={row.ruangan}>
          <span className="line-clamp-2 text-cyan-800">{row.ruangan || "-"}</span>
        </td>
      ) : null}
      <td className="max-w-[180px] truncate py-2.5 pr-3" title={row.diagnosa}>
        {row.diagnosa}
      </td>
      <td className="py-2.5">{row.penjamin}</td>
    </tr>
  );
}

function LoadingSkeleton({ variant }: { variant: "card" | "table" }) {
  if (variant === "card") {
    return (
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="hidden space-y-3 md:block">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
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

  useEffect(() => {
    if (!config) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [config]);

  if (!config) return null;

  const showRuangan = config.tipe === "status_inap_aktif";
  const hasMore = rows.length < total;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drilldown-title"
      onClick={onClose}
    >
      <div
        className="flex h-[92dvh] w-full max-w-4xl flex-col rounded-t-2xl bg-white shadow-xl sm:h-auto sm:max-h-[min(85dvh,900px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-zinc-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="drilldown-title"
              className="text-base font-semibold text-zinc-900 sm:text-lg"
            >
              {config.title}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">{config.subtitle}</p>
            {!loading && (
              <p className="mt-1 text-xs text-zinc-400">
                Menampilkan {rows.length} dari {total.toLocaleString("id-ID")} pasien
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
          {loading ? (
            <>
              <LoadingSkeleton variant="card" />
              <LoadingSkeleton variant="table" />
            </>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              Tidak ada data pasien.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {rows.map((row) => (
                  <PasienRowCard
                    key={`${row.id}-${row.no_rawat ?? ""}`}
                    row={row}
                    showRuangan={showRuangan}
                  />
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-500">
                      <th className="pb-2 pr-3 font-medium">ID</th>
                      <th className="pb-2 pr-3 font-medium">Nama</th>
                      <th className="pb-2 pr-3 font-medium">Umur</th>
                      <th className="pb-2 pr-3 font-medium">Gender</th>
                      <th className="pb-2 pr-3 font-medium">Rawat</th>
                      {showRuangan ? (
                        <th className="pb-2 pr-3 font-medium">Ruangan</th>
                      ) : null}
                      <th className="pb-2 pr-3 font-medium">Diagnosa</th>
                      <th className="pb-2 font-medium">Penjamin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <PasienRowTable
                        key={`${row.id}-${row.no_rawat ?? ""}-table`}
                        row={row}
                        showRuangan={showRuangan}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {hasMore && !loading && !error && (
          <div className="shrink-0 border-t border-zinc-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => load(rows.length)}
              className="w-full rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {loadingMore ? "Memuat…" : "Muat lebih banyak"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
