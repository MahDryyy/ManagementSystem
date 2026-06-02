"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchStrukKeuangan } from "@/lib/api/dashboard-keuangan";
import type { StrukResponse } from "@/lib/types/dashboard-keuangan";
import { formatRupiah } from "@/lib/format-currency";
import { Skeleton } from "@/components/ui/Skeleton";

type StrukDrawerProps = {
  noRawat: string | null;
  onClose: () => void;
};

function formatDate(iso: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function headerTheme(kategori: string): {
  wrap: string;
  header: string;
  badge: string;
} {
  const k = (kategori || "").toLowerCase();

  const mk = (wrap: string, header: string, badge: string) => ({ wrap, header, badge });

  if (k.includes("obat") || k.includes("resep")) {
    return mk("border-emerald-200", "bg-emerald-50", "text-emerald-800");
  }
  if (k.includes("laborat") || k.includes("lab")) {
    return mk("border-violet-200", "bg-violet-50", "text-violet-800");
  }
  if (k.includes("radiologi") || k.includes("radio")) {
    return mk("border-indigo-200", "bg-indigo-50", "text-indigo-800");
  }
  if (k.includes("registrasi") || k.includes("administrasi")) {
    return mk("border-sky-200", "bg-sky-50", "text-sky-800");
  }
  if (k.includes("kamar")) {
    return mk("border-amber-200", "bg-amber-50", "text-amber-900");
  }
  if (k.includes("potongan")) {
    return mk("border-rose-200", "bg-rose-50", "text-rose-800");
  }
  if (k.includes("tambahan")) {
    return mk("border-teal-200", "bg-teal-50", "text-teal-800");
  }
  if (k.includes("dokter") || k.includes("perawat") || k.includes("tindakan")) {
    return mk("border-cyan-200", "bg-cyan-50", "text-cyan-900");
  }
  if (k.includes("harian") || k.includes("service")) {
    return mk("border-zinc-200", "bg-zinc-50", "text-zinc-700");
  }
  return mk("border-zinc-200", "bg-zinc-50", "text-zinc-700");
}

export default function StrukDrawer({ noRawat, onClose }: StrukDrawerProps) {
  const [data, setData] = useState<StrukResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noRawat) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchStrukKeuangan(noRawat)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Gagal memuat struk");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [noRawat]);

  useEffect(() => {
    if (!noRawat) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [noRawat, onClose]);

  useEffect(() => {
    if (!noRawat) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [noRawat]);

  if (!noRawat) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl sm:max-w-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="struk-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="struk-title" className="truncate text-lg font-semibold text-zinc-900">
              {loading ? "Memuat…" : "Struk Pembayaran"}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-cyan-700">{noRawat}</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : data ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {data.nama_pasien || "Pasien"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      RM: <span className="font-mono">{data.no_rkm_medis || "-"}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Tanggal: {formatDate(data.tanggal)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
                      Cara bayar
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-zinc-800">
                      {data.cara_bayar || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-100">
                <div className="border-b border-zinc-100 px-4 py-3">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Rincian item
                  </p>
                </div>
                {data.subtotal && data.subtotal.length > 0 && data.items?.length ? (
                  <div className="divide-y divide-zinc-100">
                    {data.subtotal.map((group) => {
                      const itemsInGroup = data.items.filter(
                        (it) => it.status === group.kategori,
                      );
                      if (itemsInGroup.length === 0) return null;
                      const theme = headerTheme(group.kategori);
                      return (
                        <section
                          key={group.kategori}
                          className={`border-l-4 ${theme.wrap}`}
                        >
                          <header
                            className={`flex items-center justify-between gap-3 px-4 py-2 ${theme.header}`}
                          >
                            <span
                              className={`text-xs font-semibold uppercase tracking-wide ${theme.badge}`}
                            >
                              {group.kategori}
                            </span>
                            <span
                              className={`text-xs font-semibold tabular-nums ${theme.badge}`}
                            >
                              {formatRupiah(group.total)}
                            </span>
                          </header>
                          <div className="divide-y divide-zinc-100">
                            {itemsInGroup.map((it, idx) => (
                              <div
                                key={`${group.kategori}-${it.noindex}-${idx}`}
                                className="px-4 py-2.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-zinc-900">
                                      {it.nama}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-zinc-500">
                                      qty {it.jumlah.toLocaleString("id-ID")} ×{" "}
                                      {formatRupiah(it.biaya, true)}
                                    </p>
                                  </div>
                                  <p className="shrink-0 font-semibold tabular-nums text-zinc-900">
                                    {formatRupiah(it.total_biaya)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-zinc-400">
                    Tidak ada item struk.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-100 bg-white">
                <div className="border-b border-zinc-100 px-4 py-3">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Subtotal per kategori
                  </p>
                </div>
                <div className="px-4 py-3">
                  {data.subtotal && data.subtotal.length > 0 ? (
                    <div className="space-y-2">
                      {data.subtotal.map((s) => (
                        <div
                          key={s.kategori}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-zinc-700">{s.kategori}</span>
                          <span className="font-medium tabular-nums text-zinc-900">
                            {formatRupiah(s.total)}
                          </span>
                        </div>
                      ))}
                      <div className="mt-3 flex items-center justify-between border-t border-dashed border-zinc-200 pt-3">
                        <span className="text-sm font-semibold text-zinc-900">
                          Total
                        </span>
                        <span className="text-base font-bold tabular-nums text-emerald-700">
                          {formatRupiah(data.grand_total)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">-</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

