"use client";

import { FlaskConical } from "lucide-react";
import type {
  GrafikTitik,
  KeuanganPeriode,
  RingkasanPendapatanLaborat,
} from "@/lib/types/dashboard-keuangan";
import { KEUANGAN_PERIODE_OPTIONS } from "@/lib/types/dashboard-keuangan";
import { formatRupiah } from "@/lib/format-currency";
import { Skeleton } from "@/components/ui/Skeleton";

const PERIODE_TOTAL_KEY: Record<
  KeuanganPeriode,
  keyof RingkasanPendapatanLaborat
> = {
  hari_ini: "harian",
  minggu_ini: "mingguan",
  bulan_ini: "bulanan",
  tahun_ini: "tahunan",
  semua: "semua",
};

const RINCIAN_LABEL: Record<KeuanganPeriode, string> = {
  hari_ini: "Per jam",
  minggu_ini: "Per hari",
  bulan_ini: "Per tanggal",
  tahun_ini: "Per bulan",
  semua: "Per tahun",
};

type PendapatanLaboratPanelProps = {
  ringkasan: RingkasanPendapatanLaborat;
  rincian: GrafikTitik[];
  periode: KeuanganPeriode;
  onPeriodeChange: (p: KeuanganPeriode) => void;
  loading?: boolean;
  rincianLoading?: boolean;
};

export default function PendapatanLaboratPanel({
  ringkasan,
  rincian,
  periode,
  onPeriodeChange,
  loading,
  rincianLoading,
}: PendapatanLaboratPanelProps) {
  const maxNilai = Math.max(...rincian.map((d) => d.nilai), 1);
  const periodeLabel =
    KEUANGAN_PERIODE_OPTIONS.find((o) => o.value === periode)?.label ??
    periode;
  const totalPeriode = ringkasan[PERIODE_TOTAL_KEY[periode]];

  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
          <FlaskConical className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-800">
            Pendapatan Laboratorium
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Total biaya pemeriksaan dari tabel periksa_lab
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {KEUANGAN_PERIODE_OPTIONS.map((opt) => {
            const total = ringkasan[PERIODE_TOTAL_KEY[opt.value]];
            const selected = periode === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPeriodeChange(opt.value)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? "border-violet-300 bg-violet-50 shadow-sm ring-1 ring-violet-200"
                    : "border-zinc-100 bg-zinc-50/80 hover:border-violet-200 hover:bg-violet-50/40"
                }`}
              >
                <p
                  className={`text-xs font-medium ${selected ? "text-violet-700" : "text-zinc-500"}`}
                >
                  {opt.label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900 sm:text-xl">
                  {formatRupiah(total, total >= 1_000_000)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 border-t border-zinc-100 pt-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-zinc-800">
              Rincian {periodeLabel.toLowerCase()}
            </h4>
            {!loading && (
              <p className="mt-0.5 text-xs text-violet-600">
                Total {formatRupiah(totalPeriode, totalPeriode >= 1_000_000)}
              </p>
            )}
          </div>
          <span className="text-xs text-zinc-400">{RINCIAN_LABEL[periode]}</span>
        </div>

        {rincianLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : rincian.length === 0 ? (
          <p className="rounded-xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400">
            Belum ada pemeriksaan lab pada periode ini.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {rincian.map((item, i) => {
              const pct = (item.nilai / maxNilai) * 100;

              return (
                <li
                  key={`${item.label}-${i}`}
                  className="grid grid-cols-[3rem_1fr_auto] items-center gap-3"
                >
                  <span className="text-xs font-medium tabular-nums text-zinc-500">
                    {item.label}
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="min-w-[4.5rem] text-right text-xs font-semibold tabular-nums text-zinc-700">
                    {formatRupiah(item.nilai, item.nilai >= 1_000_000)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
