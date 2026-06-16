"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  Loader2,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth/storage";

// ─── Types ───────────────────────────────────────────────────────────────────

type Periode = "hari_ini" | "minggu_ini" | "bulan_ini" | "tahun_ini";
type ReportType = "pasien" | "keuangan" | "obat" | "website";

interface PeriodeOption {
  key: Periode;
  label: string;
  sublabel: string;
  icon: React.ElementType;
}

interface ReportCard {
  key: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  available: boolean;
  endpoints?: {
    detail: string;
    ringkasan: string;
  };
}

interface DownloadState {
  [key: string]: "idle" | "loading" | "success" | "error";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PERIODE_OPTIONS: PeriodeOption[] = [
  { key: "hari_ini", label: "Harian", sublabel: "Data 1 hari terakhir", icon: Clock },
  { key: "minggu_ini", label: "Mingguan", sublabel: "Data 7 hari terakhir", icon: Calendar },
  { key: "bulan_ini", label: "Bulanan", sublabel: "Data 30 hari terakhir", icon: BarChart3 },
  { key: "tahun_ini", label: "Tahunan", sublabel: "Data 1 tahun terakhir", icon: TrendingUp },
];

const REPORT_CARDS: ReportCard[] = [
  {
    key: "pasien",
    title: "Laporan Pasien",
    description: "Data kunjungan, diagnosa, demografi, & status perawatan pasien",
    icon: Users,
    color: "#3B82F6",
    gradientFrom: "#EFF6FF",
    gradientTo: "#DBEAFE",
    available: true,
    endpoints: {
      detail: "/api/laporan/pasien/csv",
      ringkasan: "/api/laporan/pasien/ringkasan/csv",
    },
  },
  {
    key: "keuangan",
    title: "Laporan Keuangan",
    description: "Pendapatan, pengeluaran, akun rekening, & ringkasan finansial",
    icon: Wallet,
    color: "#10B981",
    gradientFrom: "#ECFDF5",
    gradientTo: "#D1FAE5",
    available: true,
    endpoints: {
      detail: "/api/laporan/keuangan/csv",
      ringkasan: "/api/laporan/keuangan/ringkasan/csv",
    },
  },
  {
    key: "obat",
    title: "Laporan Obat",
    description: "Inventaris stok obat & riwayat penggunaan farmasi",
    icon: Package,
    color: "#F59E0B",
    gradientFrom: "#FFFBEB",
    gradientTo: "#FEF3C7",
    available: false,
  },
  {
    key: "website",
    title: "Laporan Website",
    description: "Statistik kunjungan & aktivitas pengguna website",
    icon: Globe,
    color: "#EF4444",
    gradientFrom: "#FEF2F2",
    gradientTo: "#FEE2E2",
    available: false,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDownloadUrl(path: string, params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return `${API_BASE_URL}${path}?${q.toString()}`;
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

function periodeLabel(p: Periode) {
  return PERIODE_OPTIONS.find((o) => o.key === p)?.label ?? p;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBadge({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white border border-zinc-100 px-4 py-3 shadow-sm">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: color + "18" }}
      >
        <Icon className="h-4.5 w-4.5" style={{ color }} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-zinc-800">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardLaporan() {
  const [selectedPeriode, setSelectedPeriode] = useState<Periode>("minggu_ini");
  const [selectedTypes, setSelectedTypes] = useState<Set<ReportType>>(new Set(["pasien"]));
  const [downloadState, setDownloadState] = useState<DownloadState>({});
  const [lastDownload, setLastDownload] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  // New state for diagnosis statistics
  const [diagnosisStats, setDiagnosisStats] = useState<Array<{ diagnosis: string; count: number }>>([]);
  // Ref for PDF export
  const reportRef = useRef<HTMLDivElement>(null);

  // Reset success states after 3s
  useEffect(() => {
    const keys = Object.entries(downloadState)
      .filter(([, s]) => s === "success" || s === "error")
      .map(([k]) => k);
    if (keys.length === 0) return;
    const t = setTimeout(() => {
      setDownloadState((prev) => {
        const next = { ...prev };
        keys.forEach((k) => { if (next[k] === "success" || next[k] === "error") next[k] = "idle"; });
        return next;
      });
    }, 3000);
    return () => clearTimeout(t);
  }, [downloadState]);

  // Fetch diagnosis statistics when periode changes
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/laporan/diagnosa?range=${selectedPeriode}`);
        if (!res.ok) throw new Error('Failed to fetch diagnosis stats');
        const data = await res.json();
        setDiagnosisStats(data);
      } catch (e) {
        console.error(e);
        setDiagnosisStats([]);
      }
    };
    fetchStats();
  }, [selectedPeriode]);

  const toggleType = (key: ReportType, available: boolean) => {
    if (!available) return;
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleDownload = useCallback(
    async (card: ReportCard, mode: "detail" | "ringkasan") => {
      if (!card.available || !card.endpoints) return;
      const stateKey = `${card.key}-${mode}`;
      setDownloadState((p) => ({ ...p, [stateKey]: "loading" }));
      try {
        const path = mode === "detail" ? card.endpoints.detail : card.endpoints.ringkasan;
        const params: Record<string, string> = { periode: selectedPeriode };
        const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const filename = `${mode === "ringkasan" ? "ringkasan" : "laporan"}_${card.key}_${selectedPeriode}_${ts}.csv`;
        await triggerDownload(buildDownloadUrl(path, params), filename);
        setDownloadState((p) => ({ ...p, [stateKey]: "success" }));
        setLastDownload(new Date().toLocaleTimeString("id-ID"));
      } catch {
        setDownloadState((p) => ({ ...p, [stateKey]: "error" }));
      }
    },
    [selectedPeriode],
  );

  const handleDownloadAll = useCallback(async () => {
    const available = REPORT_CARDS.filter(
      (c) => c.available && selectedTypes.has(c.key) && c.endpoints,
    );
    if (available.length === 0) return;
    setBulkLoading(true);
    try {
      for (const card of available) {
        await handleDownload(card, "detail");
        await new Promise((r) => setTimeout(r, 400));
      }
    } finally {
      setBulkLoading(false);
    }
  }, [handleDownload, selectedTypes]);

  const activeAvailableCount = REPORT_CARDS.filter(
    (c) => c.available && selectedTypes.has(c.key),
  ).length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50" ref={reportRef}>
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 bg-white px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Dashboard Laporan
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Atur periode dan unduh laporan operasional klinik dalam format CSV
            </p>
          </div>
          {lastDownload && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terakhir diunduh: {lastDownload}
            </div>
          )}
          {/* Export PDF Button */}
          <button
            type="button"
            onClick={async () => {
              if (!reportRef.current) return;
              const canvas = await html2canvas(reportRef.current);
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const imgProps = pdf.getImageProperties(imgData);
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              pdf.save(`Laporan_${selectedPeriode}_${new Date().toISOString().slice(0,10)}.pdf`);
            }}
            className="ml-4 flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBadge icon={Users} label="Laporan Tersedia" value="2 Laporan" color="#3B82F6" />
          <StatBadge icon={FileSpreadsheet} label="Format Ekspor" value="CSV / Excel" color="#10B981" />
          <StatBadge icon={Activity} label="Periode Aktif" value={periodeLabel(selectedPeriode)} color="#8B5CF6" />
          <StatBadge icon={ArrowDown} label="Dipilih" value={`${activeAvailableCount} laporan`} color="#F59E0B" />
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 space-y-6">

        {/* ── Section: Pilih Periode ────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 border border-cyan-100">
              <Calendar className="h-3.5 w-3.5 text-cyan-600" strokeWidth={2} />
            </div>
            <h2 className="text-sm font-semibold text-zinc-700">Pilih Periode Laporan</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PERIODE_OPTIONS.map((opt) => {
              const isActive = selectedPeriode === opt.key;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  id={`periode-${opt.key}`}
                  type="button"
                  onClick={() => setSelectedPeriode(opt.key)}
                  className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
                    isActive
                      ? "border-cyan-400 bg-white shadow-md shadow-cyan-100"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-sky-50 opacity-60" />
                  )}
                  <div className="relative flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive ? "bg-cyan-100" : "bg-zinc-100 group-hover:bg-zinc-200"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${isActive ? "text-cyan-600" : "text-zinc-500"}`}
                        strokeWidth={1.8}
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? "text-cyan-700" : "text-zinc-700"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className={`mt-0.5 text-xs ${isActive ? "text-cyan-500" : "text-zinc-400"}`}>
                        {opt.sublabel}
                      </p>
                    </div>
                    {isActive && (
                      <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-cyan-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Section: Pilih Jenis Laporan ─────────────────────── */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 border border-violet-100">
              <FileText className="h-3.5 w-3.5 text-violet-600" strokeWidth={2} />
            </div>
            <h2 className="text-sm font-semibold text-zinc-700">Pilih Jenis Laporan</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REPORT_CARDS.map((card) => {
              const Icon = card.icon;
              const isSelected = selectedTypes.has(card.key);
              const detailKey = `${card.key}-detail`;
              const ringkasanKey = `${card.key}-ringkasan`;
              const isDetailLoading = downloadState[detailKey] === "loading";
              const isRingkasanLoading = downloadState[ringkasanKey] === "loading";
              const isDetailSuccess = downloadState[detailKey] === "success";
              const isRingkasanSuccess = downloadState[ringkasanKey] === "success";
              const isDetailError = downloadState[detailKey] === "error";
              const isRingkasanError = downloadState[ringkasanKey] === "error";

              return (
                <div
                  key={card.key}
                  id={`laporan-card-${card.key}`}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                    !card.available
                      ? "border-zinc-100 bg-zinc-50 opacity-60"
                      : isSelected
                      ? "border-zinc-300 bg-white shadow-md"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                  }`}
                >
                  {/* Card header gradient strip */}
                  <div
                    className="h-1.5 w-full"
                    style={{
                      background: card.available
                        ? `linear-gradient(90deg, ${card.color}80, ${card.color}30)`
                        : "#e4e4e7",
                    }}
                  />

                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})` }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: card.available ? card.color : "#a1a1aa" }}
                          strokeWidth={1.8}
                        />
                      </div>

                      {/* Title & description */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-800">{card.title}</p>
                          {!card.available && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                              Segera Hadir
                            </span>
                          )}
                          {card.available && isSelected && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ background: card.color + "18", color: card.color }}
                            >
                              Dipilih
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 flex items-center gap-2">
                      {/* Select/deselect toggle */}
                      <button
                        type="button"
                        disabled={!card.available}
                        onClick={() => toggleType(card.key, card.available)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                          !card.available
                            ? "cursor-not-allowed border-zinc-200 text-zinc-400"
                            : isSelected
                            ? "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                        }`}
                      >
                        {isSelected ? "Batalkan" : "Pilih"}
                      </button>

                      {card.available && (
                        <>
                          {/* Download detail CSV */}
                          <DownloadBtn
                            id={`btn-detail-${card.key}`}
                            label={
                              isDetailSuccess
                                ? "Terunduh!"
                                : isDetailError
                                ? "Gagal"
                                : "Detail CSV"
                            }
                            loading={isDetailLoading}
                            success={isDetailSuccess}
                            error={isDetailError}
                            color={card.color}
                            onClick={() => handleDownload(card, "detail")}
                          />

                          {/* Download ringkasan CSV */}
                          <DownloadBtn
                            id={`btn-ringkasan-${card.key}`}
                            label={
                              isRingkasanSuccess
                                ? "Terunduh!"
                                : isRingkasanError
                                ? "Gagal"
                                : "Ringkasan"
                            }
                            loading={isRingkasanLoading}
                            success={isRingkasanSuccess}
                            error={isRingkasanError}
                            color={card.color}
                            variant="outline"
                            onClick={() => handleDownload(card, "ringkasan")}
                          />

                          {/* Download PDF for this card */}
                          <DownloadBtn
                            id={`btn-pdf-${card.key}`}
                            label={"PDF"}
                            loading={false}
                            success={false}
                            error={false}
                            color={card.color}
                            onClick={async () => {
                              const cardEl = document.getElementById(`laporan-card-${card.key}`);
                              if (!cardEl) return;
                              const canvas = await html2canvas(cardEl);
                              const imgData = canvas.toDataURL('image/png');
                              const pdf = new jsPDF('p', 'mm', 'a4');
                              const imgProps = pdf.getImageProperties(imgData);
                              const pdfWidth = pdf.internal.pageSize.getWidth();
                              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                              pdf.save(`Laporan_${card.key}_${selectedPeriode}.pdf`);
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section: Download All ─────────────────────────────── */}
        <section>
          <div
            className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            id="section-download-semua"
          >
            {/* Decorative gradient blob */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 blur-2xl opacity-60" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  Unduh Semua Laporan Sekaligus
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Periode aktif:{" "}
                  <span className="font-semibold text-cyan-600">
                    {periodeLabel(selectedPeriode)}
                  </span>
                  {activeAvailableCount > 0 && (
                    <>
                      {" · "}
                      <span className="font-medium text-zinc-600">
                        {activeAvailableCount} jenis laporan dipilih
                      </span>
                    </>
                  )}
                </p>

                {activeAvailableCount === 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Pilih minimal 1 laporan yang tersedia terlebih dahulu
                  </div>
                )}
              </div>

              <button
                id="btn-download-semua"
                type="button"
                disabled={activeAvailableCount === 0 || bulkLoading}
                onClick={handleDownloadAll}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ${
                  activeAvailableCount === 0 || bulkLoading
                    ? "cursor-not-allowed bg-zinc-300"
                    : "bg-zinc-900 hover:bg-zinc-800 hover:shadow-md active:scale-95"
                }`}
              >
                {bulkLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengunduh...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="h-4 w-4" />
                    Download Semua
                  </>
                )}
              </button>
            </div>

            {/* Progress indicator during bulk download */}
            {bulkLoading && (
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: "60%" }} />
              </div>
            )}
          </div>
        </section>

        {/* ── Section: Info & Tips ──────────────────────────────── */}
        <section>
          <div className="rounded-2xl border border-zinc-100 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-zinc-400" strokeWidth={1.8} />
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Panduan Penggunaan
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Pilih Periode",
                  desc: "Tentukan rentang waktu laporan: harian, mingguan, bulanan, atau tahunan.",
                  color: "#06B6D4",
                },
                {
                  step: "2",
                  title: "Pilih Jenis Laporan",
                  desc: "Centang jenis laporan yang ingin diunduh (Pasien, Keuangan, dll).",
                  color: "#8B5CF6",
                },
                {
                  step: "3",
                  title: "Unduh File CSV",
                  desc: "Klik tombol unduh per laporan, atau gunakan 'Download Semua' untuk semua sekaligus.",
                  color: "#10B981",
                },
              ].map((tip) => (
                <div key={tip.step} className="flex gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: tip.color }}
                  >
                    {tip.step}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-700">{tip.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Reusable Download Button ─────────────────────────────────────────────────

function DownloadBtn({
  id,
  label,
  loading,
  success,
  error,
  color,
  variant = "filled",
  onClick,
}: {
  id: string;
  label: string;
  loading: boolean;
  success: boolean;
  error: boolean;
  color: string;
  variant?: "filled" | "outline";
  onClick: () => void;
}) {
  const baseClass =
    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed";

  if (variant === "outline") {
    return (
      <button
        id={id}
        type="button"
        disabled={loading}
        onClick={onClick}
        className={`${baseClass} border ${
          success
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : error
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
        }`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : success ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : error ? (
          <AlertCircle className="h-3 w-3" />
        ) : (
          <FileText className="h-3 w-3" />
        )}
        {label}
      </button>
    );
  }

  return (
    <button
      id={id}
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`${baseClass} ${
        success
          ? "bg-emerald-500 text-white"
          : error
          ? "bg-red-500 text-white"
          : "text-white"
      }`}
      style={
        !success && !error ? { backgroundColor: color } : undefined
      }
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : success ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : error ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <Download className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}
