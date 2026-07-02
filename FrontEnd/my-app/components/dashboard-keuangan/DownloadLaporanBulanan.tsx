"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Download, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth/storage";

const BULAN_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

function buildTahunOptions() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= current - 3; y--) years.push(y);
  return years;
}

async function triggerDownload(url: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Gagal mengunduh (${res.status})`);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export default function DownloadLaporanBulanan() {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tahunOptions = buildTahunOptions();

  const handleDownload = async () => {
    setState("loading");
    setErrorMsg(null);
    try {
      const url = `${API_BASE_URL}/api/laporan/keuangan/laporan-bulanan/excel?bulan=${bulan}&tahun=${tahun}`;
      const filename = `laporan_keuangan_${String(bulan).padStart(2, "0")}_${tahun}.xlsx`;
      await triggerDownload(url, filename);
      setState("success");
      setTimeout(() => setState("idle"), 3000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Gagal mengunduh laporan");
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={bulan}
        onChange={(e) => setBulan(Number(e.target.value))}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-cyan-400 focus:outline-none"
      >
        {BULAN_OPTIONS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
      <select
        value={tahun}
        onChange={(e) => setTahun(Number(e.target.value))}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-cyan-400 focus:outline-none"
      >
        {tahunOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={state === "loading"}
        onClick={handleDownload}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed ${
          state === "success"
            ? "bg-emerald-500"
            : state === "error"
            ? "bg-red-500"
            : "bg-cyan-600 hover:bg-cyan-700"
        }`}
        title="Unduh laporan kas, pendapatan, pengeluaran & statistik pasien bulanan (.xlsx)"
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "success" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : state === "error" ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {state === "loading"
          ? "Mengunduh..."
          : state === "success"
          ? "Terunduh!"
          : state === "error"
          ? "Gagal"
          : "Download Laporan"}
      </button>
      {state === "error" && errorMsg && (
        <span className="text-xs text-red-600">{errorMsg}</span>
      )}
    </div>
  );
}
