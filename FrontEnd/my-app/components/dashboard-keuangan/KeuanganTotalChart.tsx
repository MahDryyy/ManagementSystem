"use client";

import type {
  KeuanganPeriode,
  KeuanganTotalTitik,
} from "@/lib/types/dashboard-keuangan";
import { KEUANGAN_PERIODE_OPTIONS } from "@/lib/types/dashboard-keuangan";
import FinanceChart from "@/components/dashboard-keuangan/FinanceChart";
import { Skeleton } from "@/components/ui/Skeleton";

type KeuanganTotalChartProps = {
  data: KeuanganTotalTitik[];
  periode: KeuanganPeriode;
  onPeriodeChange: (p: KeuanganPeriode) => void;
  loading?: boolean;
};

export default function KeuanganTotalChart({
  data,
  periode,
  onPeriodeChange,
  loading,
}: KeuanganTotalChartProps) {
  const labels = data.map((d) => d.label);
  const pemasukan = data.map((d) => d.pemasukan);
  const pengeluaran = data.map((d) => d.pengeluaran);

  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-800">
            Keuangan Total
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Garis hijau pemasukan · oranye pengeluaran (hover titik untuk
            detail)
          </p>
        </div>
        <div className="flex flex-wrap rounded-full bg-zinc-100 p-1 text-xs font-medium">
          {KEUANGAN_PERIODE_OPTIONS.filter((o) => o.value !== "semua").map(
            (opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                onClick={() => onPeriodeChange(opt.value)}
                className={`rounded-full px-3 py-1.5 transition-all disabled:opacity-60 sm:px-4 ${
                  periode === opt.value
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {opt.label}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 rounded-full bg-emerald-500" />
          Pemasukan
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 rounded-full bg-orange-500" />
          Pengeluaran
        </span>
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-[480px] w-full rounded-xl" />
      ) : (
        <div className="mt-4">
          <FinanceChart
            labels={labels}
            series={[
              {
                id: "pemasukan",
                name: "Pemasukan",
                color: "#22c55e",
                values: pemasukan,
                fillGradient: true,
              },
              {
                id: "pengeluaran",
                name: "Pengeluaran",
                color: "#f97316",
                values: pengeluaran,
              },
            ]}
            height={480}
            emptyMessage="Belum ada transaksi pada periode ini."
          />
        </div>
      )}
    </div>
  );
}
