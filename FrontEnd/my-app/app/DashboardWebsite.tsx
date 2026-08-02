"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Globe2,
  Loader2,
  MessageCircle,
  MousePointerClick,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";
import DashboardWebsiteSkeleton from "@/components/dashboard-website/DashboardWebsiteSkeleton";
import {
  fetchWebReview,
  fetchWebSosmedStat,
  fetchWebSosmedEngagement,
  fetchWebVisitor,
  fetchWebSocialClicks,
  fetchWebVisitorSessions,
  fetchWebTiktokHitStats,
  fetchWebTiktokStat,
} from "@/lib/api/dashboard-website";
import type {
  DashboardWebsiteResponse,
  WebApiResponse,
} from "@/lib/types/dashboard-website";

type TabKey = "semua" | "website" | "sosial" | "tiktok";

type HighlightConfig = {
  label: string;
  hints: string[];
  suffix?: string;
};

type SectionConfig = {
  id: string;
  tab: TabKey;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  border: string;
  dataKey: keyof DashboardWebsiteResponse;
  highlights: HighlightConfig[];
};

const SECTIONS: SectionConfig[] = [
  {
    id: "review",
    tab: "website",
    title: "Review Website",
    description: "Rating dan ulasan dari pengunjung website.",
    icon: Sparkles,
    accent: "text-amber-600",
    iconBg: "bg-amber-50",
    border: "border-l-amber-400",
    dataKey: "review",
    highlights: [
      { label: "Total review", hints: ["review", "count", "total"] },
      { label: "Rating rata-rata", hints: ["rating", "average", "score"], suffix: "/ 5" },
    ],
  },
  {
    id: "visitor",
    tab: "website",
    title: "Pengunjung Website",
    description: "Statistik kunjungan dan lalu lintas website.",
    icon: Globe2,
    accent: "text-cyan-600",
    iconBg: "bg-cyan-50",
    border: "border-l-cyan-400",
    dataKey: "visitor",
    highlights: [
      { label: "Total pengunjung", hints: ["visitor", "visit", "total", "count"] },
      { label: "Halaman dikunjungi", hints: ["page", "pages", "visited"] },
    ],
  },
  {
    id: "visitorSessions",
    tab: "website",
    title: "Sesi Pengunjung",
    description: "Detail sesi dan durasi kunjungan.",
    icon: TrendingUp,
    accent: "text-sky-600",
    iconBg: "bg-sky-50",
    border: "border-l-sky-400",
    dataKey: "visitorSessions",
    highlights: [
      { label: "Jumlah sesi", hints: ["session", "count", "total"] },
      { label: "Durasi", hints: ["duration", "durasi", "second"], suffix: " detik" },
    ],
  },
  {
    id: "sosmed",
    tab: "sosial",
    title: "Sosial Media",
    description: "Statistik kanal sosial media publik.",
    icon: Users,
    accent: "text-violet-600",
    iconBg: "bg-violet-50",
    border: "border-l-violet-400",
    dataKey: "sosmed",
    highlights: [
      { label: "Follower", hints: ["follower", "subscriber", "total"] },
      { label: "Engagement rate", hints: ["engagement", "rate"], suffix: "%" },
    ],
  },
  {
    id: "engagement",
    tab: "sosial",
    title: "Engagement Sosial",
    description: "Interaksi dan aktivitas pengguna sosial media.",
    icon: MessageCircle,
    accent: "text-indigo-600",
    iconBg: "bg-indigo-50",
    border: "border-l-indigo-400",
    dataKey: "socialMediaEngagement",
    highlights: [
      { label: "Likes", hints: ["like"] },
      { label: "Comments", hints: ["comment"] },
      { label: "Shares", hints: ["share"] },
    ],
  },
  {
    id: "clicks",
    tab: "sosial",
    title: "Klik Sosial",
    description: "Klik dan konversi dari profil sosial media.",
    icon: MousePointerClick,
    accent: "text-fuchsia-600",
    iconBg: "bg-fuchsia-50",
    border: "border-l-fuchsia-400",
    dataKey: "socialClicks",
    highlights: [
      { label: "Klik sosial", hints: ["click", "count", "total"] },
      { label: "Platform aktif", hints: ["platform"] },
    ],
  },
  {
    id: "tiktok",
    tab: "tiktok",
    title: "TikTok",
    description: "Performa akun dan video TikTok.",
    icon: Video,
    accent: "text-rose-600",
    iconBg: "bg-rose-50",
    border: "border-l-rose-400",
    dataKey: "tiktok",
    highlights: [
      { label: "Followers", hints: ["follower"] },
      { label: "Posts", hints: ["post"] },
      { label: "Engagement", hints: ["engagement", "rate"], suffix: "%" },
    ],
  },
  {
    id: "tiktokHits",
    tab: "tiktok",
    title: "Hit Stats TikTok",
    description: "Video terpopuler dan metrik hit.",
    icon: BarChart3,
    accent: "text-pink-600",
    iconBg: "bg-pink-50",
    border: "border-l-pink-400",
    dataKey: "tiktokHitStats",
    highlights: [
      { label: "Total hit", hints: ["hit", "count", "total"] },
      { label: "Video aktif", hints: ["video", "post"] },
    ],
  },
];

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "website", label: "Website" },
  { key: "sosial", label: "Sosial Media" },
  { key: "tiktok", label: "TikTok" },
];

const TECHNICAL_KEYS = new Set([
  "success",
  "status",
  "message",
  "error",
  "code",
  "meta",
  "pagination",
]);

function formatKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeApiResponse(value: unknown): WebApiResponse {
  if (!isPlainObject(value)) return {};

  const dataValue = value.data;
  if (isPlainObject(dataValue)) {
    return sanitizeApiResponse(dataValue);
  }

  if (Array.isArray(dataValue)) {
    return { items: dataValue };
  }

  const entries = Object.entries(value).filter(([key]) => !TECHNICAL_KEYS.has(key.toLowerCase()));

  return Object.fromEntries(entries);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatMetricNumber(value: number): string {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function formatDisplayValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") {
    const lower = key.toLowerCase();
    if (lower.includes("rating") || lower.includes("score")) {
      return formatMetricNumber(value);
    }
    if (lower.includes("percent") || lower.includes("rate")) {
      return `${formatMetricNumber(value)}%`;
    }
    return formatMetricNumber(value);
  }
  if (typeof value === "string") {
    const asNum = Number(value);
    if (!Number.isNaN(asNum) && value.trim() !== "" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
      return formatMetricNumber(asNum);
    }
    return value;
  }
  return String(value);
}

function findNumericDeep(obj: WebApiResponse, hints: string[]): number {
  let best = 0;

  const walk = (node: unknown, depth: number) => {
    if (depth > 3 || node === null || node === undefined) return;

    if (typeof node === "number" && Number.isFinite(node)) {
      if (node > best) best = node;
      return;
    }

    if (typeof node === "string") {
      const n = Number(node);
      if (!Number.isNaN(n) && n > best) best = n;
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1));
      return;
    }

    if (isPlainObject(node)) {
      for (const [k, v] of Object.entries(node)) {
        const lower = k.toLowerCase();
        if (hints.some((h) => lower.includes(h))) {
          if (typeof v === "number" && v > best) best = v;
          if (typeof v === "string") {
            const n = Number(v);
            if (!Number.isNaN(n) && n > best) best = n;
          }
        }
        walk(v, depth + 1);
      }
    }
  };

  walk(obj, 0);
  return best;
}

function findMetricValue(obj: WebApiResponse, hints: string[]): number | null {
  const matches: number[] = [];

  const walk = (node: unknown, depth: number) => {
    if (depth > 4 || node === null || node === undefined) return;

    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1));
      return;
    }

    if (!isPlainObject(node)) return;

    for (const [key, value] of Object.entries(node)) {
      const lower = key.toLowerCase();
      const numeric = toNumber(value);

      if (hints.some((hint) => lower.includes(hint)) && numeric !== null) {
        matches.push(numeric);
      }

      if (isPlainObject(value) || Array.isArray(value)) {
        walk(value, depth + 1);
      }
    }
  };

  walk(obj, 0);

  if (matches.length === 0) return null;
  return Math.max(...matches);
}

function flattenMetrics(data: WebApiResponse): { key: string; label: string; value: unknown }[] {
  const items: { key: string; label: string; value: unknown }[] = [];

  const push = (key: string, value: unknown) => {
    if (value === null || value === undefined) return;
    if (isPlainObject(value) || Array.isArray(value)) return;
    items.push({ key, label: formatKey(key), value });
  };

  for (const [key, value] of Object.entries(data)) {
    if (TECHNICAL_KEYS.has(key.toLowerCase())) continue;
    if (isPlainObject(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        push(`${key}.${nestedKey}`, nestedValue);
      }
    } else if (!Array.isArray(value)) {
      push(key, value);
    }
  }

  return items;
}

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isPlainObject(item))
  );
}

function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  ).slice(0, 6);

  if (columns.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 font-semibold">
                {formatKey(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.slice(0, 8).map((row, idx) => (
            <tr key={idx} className="hover:bg-zinc-50/80">
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 align-top text-zinc-700">
                  {formatDisplayValue(col, row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 8 ? (
        <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-400">
          +{rows.length - 8} baris lainnya
        </p>
      ) : null}
    </div>
  );
}

function SectionHighlights({
  data,
  items,
}: {
  data: WebApiResponse;
  items: HighlightConfig[];
}) {
  const resolved = items
    .map((item) => ({
      ...item,
      value: findMetricValue(data, item.hints),
    }))
    .filter((item) => item.value !== null);

  if (resolved.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {resolved.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {item.label}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">
            {formatMetricNumber(item.value ?? 0)}
            {item.suffix ? (
              <span className="ml-1 text-sm font-medium text-zinc-500">
                {item.suffix}
              </span>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  );
}

function MetricGrid({ data }: { data: WebApiResponse }) {
  const metrics = flattenMetrics(data);
  const arrayEntries = Object.entries(data).filter(
    ([key, value]) => !TECHNICAL_KEYS.has(key.toLowerCase()) && isRecordArray(value),
  );

  if (metrics.length === 0 && arrayEntries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        Tidak ada data untuk ditampilkan.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {metrics.length > 0 ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {metrics.map(({ key, label, value }) => (
            <div
              key={key}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                {label}
              </dt>
              <dd className="mt-1.5 text-lg font-semibold tabular-nums text-zinc-900">
                {formatDisplayValue(key.split(".").pop() ?? key, value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {arrayEntries.map(([key, value]) => (
        <div key={key} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {formatKey(key)}
          </p>
          <DataTable rows={value as Record<string, unknown>[]} />
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  suffix,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  suffix?: string;
}) {
  return (
    <div className="flex min-h-[112px] items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-800">
          {value > 0 ? formatMetricNumber(value) : "—"}
          {value > 0 && suffix ? (
            <span className="ml-1 text-lg font-semibold text-zinc-400">{suffix}</span>
          ) : null}
        </p>
      </div>
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg}`}
      >
        <Icon className={`h-7 w-7 ${iconColor}`} />
      </div>
    </div>
  );
}

function WebSection({
  config,
  data,
}: {
  config: SectionConfig;
  data: WebApiResponse;
}) {
  const Icon = config.icon;
  const hasData = Object.keys(data).length > 0;

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-zinc-200 border-l-4 bg-white shadow-sm ${config.border}`}
    >
      <div className="border-b border-zinc-100 p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}
          >
            <Icon className={`h-5 w-5 ${config.accent}`} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-900">{config.title}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">{config.description}</p>
          </div>
        </div>
      </div>
      <div className="space-y-5 p-5">
        {hasData ? (
          <>
            <SectionHighlights data={data} items={config.highlights} />
            <MetricGrid data={data} />
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            Data belum tersedia.
          </p>
        )}
      </div>
    </article>
  );
}

export default function DashboardWebsite() {
  const [data, setData] = useState<DashboardWebsiteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("semua");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        fetchWebReview(),
        fetchWebSosmedStat(),
        fetchWebSosmedEngagement(),
        fetchWebVisitor(),
        fetchWebSocialClicks(),
        fetchWebVisitorSessions(),
        fetchWebTiktokStat(),
        fetchWebTiktokHitStats(),
      ]);

      setData({
        review: sanitizeApiResponse(results[0].status === "fulfilled" ? results[0].value : {}),
        sosmed: sanitizeApiResponse(results[1].status === "fulfilled" ? results[1].value : {}),
        socialMediaEngagement: sanitizeApiResponse(
          results[2].status === "fulfilled" ? results[2].value : {},
        ),
        visitor: sanitizeApiResponse(results[3].status === "fulfilled" ? results[3].value : {}),
        socialClicks: sanitizeApiResponse(
          results[4].status === "fulfilled" ? results[4].value : {},
        ),
        visitorSessions: sanitizeApiResponse(
          results[5].status === "fulfilled" ? results[5].value : {},
        ),
        tiktok: sanitizeApiResponse(results[6].status === "fulfilled" ? results[6].value : {}),
        tiktokHitStats: sanitizeApiResponse(
          results[7].status === "fulfilled" ? results[7].value : {},
        ),
      });

      const rejected = results.filter((r) => r.status === "rejected");
      if (rejected.length === results.length) {
        setError("Semua sumber data gagal dimuat. Periksa koneksi dan konfigurasi API.");
      } else if (rejected.length > 0) {
        setError("Sebagian data gagal dimuat. Tampilan mungkin tidak lengkap.");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Gagal memuat dashboard website.",
      );
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kpis = useMemo(() => {
    if (!data) {
      return {
        visitors: 0,
        reviews: 0,
        rating: 0,
        social: 0,
        tiktok: 0,
      };
    }

    return {
      visitors: findNumericDeep(data.visitor, [
        "visitor",
        "visit",
        "total",
        "count",
        "session",
      ]),
      reviews: findNumericDeep(data.review, [
        "review",
        "total",
        "count",
      ]),
      rating: findNumericDeep(data.review, ["rating", "average", "score"]),
      social: findNumericDeep(data.sosmed, [
        "follower",
        "subscriber",
        "total",
        "engagement",
      ]),
      tiktok: findNumericDeep(data.tiktok, [
        "view",
        "like",
        "follower",
        "total",
      ]),
    };
  }, [data]);

  const visibleSections = SECTIONS.filter(
    (s) => activeTab === "semua" || s.tab === activeTab,
  );

  if (loading && !data) {
    return <DashboardWebsiteSkeleton />;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50">
      <FadeIn>
        <div className="border-b border-zinc-200 bg-white px-6 py-5 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                  Dashboard Website
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Ringkasan performa website, sosial media, dan TikTok.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Muat ulang
              </button>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6 sm:px-8">
        {error ? (
          <FadeIn delayMs={80}>
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </FadeIn>
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <FadeIn delayMs={100}>
                <KpiCard
                  label="Pengunjung"
                  value={kpis.visitors}
                  icon={Globe2}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                />
              </FadeIn>
              <FadeIn delayMs={160}>
                <KpiCard
                  label="Total Review"
                  value={kpis.reviews}
                  icon={Star}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                />
              </FadeIn>
              <FadeIn delayMs={220}>
                <KpiCard
                  label="Rating"
                  value={kpis.rating}
                  icon={Sparkles}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-600"
                  suffix={kpis.rating > 0 ? "/ 5" : undefined}
                />
              </FadeIn>
              <FadeIn delayMs={280}>
                <KpiCard
                  label="Sosial & TikTok"
                  value={Math.max(kpis.social, kpis.tiktok)}
                  icon={TrendingUp}
                  iconBg="bg-rose-50"
                  iconColor="text-rose-600"
                />
              </FadeIn>
            </div>

            <FadeIn delayMs={320}>
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex flex-wrap gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1">
                    {TAB_OPTIONS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          activeTab === tab.key
                            ? "bg-cyan-600 text-white shadow-sm"
                            : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>

            <div className="grid gap-5">
              {visibleSections.map((section, index) => (
                <FadeIn key={section.id} delayMs={360 + index * 60}>
                  <WebSection
                    config={section}
                    data={data[section.dataKey]}
                  />
                </FadeIn>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
            <p className="text-sm text-zinc-500">Data website tidak tersedia.</p>
            <button
              type="button"
              onClick={() => loadData()}
              className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Coba lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
