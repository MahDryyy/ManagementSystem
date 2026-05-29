"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { formatRupiah } from "@/lib/format-currency";
import { useAnimateProgress } from "@/lib/hooks/useAnimateProgress";
import {
  areaPath,
  linePath,
  nearestIndex,
  niceMax,
  pointCoords,
  yTicks,
} from "@/lib/chart-utils";
import { Skeleton } from "@/components/ui/Skeleton";

export type ChartSeries = {
  id: string;
  name: string;
  color: string;
  values: number[];
  fillGradient?: boolean;
};

type FinanceChartProps = {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
};

const DEFAULT_HEIGHT = 300;
const CHART_ASPECT = 2.4;

function chartLayout(height: number) {
  const H = height;
  const W = Math.round(height * CHART_ASPECT);
  const PAD = {
    top: Math.round(height * 0.08),
    right: Math.round(height * 0.04),
    bottom: Math.round(height * 0.14),
    left: Math.round(height * 0.16),
  };
  return { W, H, PAD };
}

function AnimatedLine({
  d,
  color,
  progress,
  strokeWidth = 3,
}: {
  d: string;
  color: string;
  progress: number;
  strokeWidth?: number;
}) {
  const ref = useRef<SVGPathElement>(null);
  const [length, setLength] = useState(0);

  useLayoutEffect(() => {
    if (ref.current) {
      setLength(ref.current.getTotalLength() || 0);
    }
  }, [d]);

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={length || undefined}
      strokeDashoffset={length ? length * (1 - progress) : undefined}
    />
  );
}

export default function FinanceChart({
  labels,
  series,
  height = DEFAULT_HEIGHT,
  loading,
  emptyMessage = "Belum ada data.",
}: FinanceChartProps) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { W, H, PAD } = chartLayout(height);

  const allValues = series.flatMap((s) => s.values);
  const maxVal = niceMax(Math.max(...allValues, 0));
  const ticks = yTicks(maxVal);
  const baseY = PAD.top + (H - PAD.top - PAD.bottom);
  const hasData = labels.length > 0 && series.length > 0;

  const chartKey = `${labels.join("|")}-${series.map((s) => `${s.id}:${s.values.join(",")}`).join("|")}`;
  const progress = useAnimateProgress(chartKey, !loading && hasData, 1000);

  const handleMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || labels.length === 0) return;
      const idx = nearestIndex(
        e.clientX,
        rect,
        labels.length,
        PAD.left,
        PAD.right,
      );
      setHoverIdx(idx);
    },
    [labels.length, PAD.left, PAD.right],
  );

  const handleLeave = () => setHoverIdx(null);

  useEffect(() => {
    setHoverIdx(null);
  }, [chartKey]);

  if (loading) {
    return (
      <div style={{ height: `${height}px` }}>
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-zinc-50/80 text-sm text-zinc-400"
        style={{ height: `${height}px` }}
      >
        {emptyMessage}
      </div>
    );
  }

  const hoverX =
    hoverIdx != null
      ? pointCoords(series[0]?.values ?? [], maxVal, W, H, PAD)[hoverIdx]?.x
      : null;

  return (
    <div
      className="relative w-full ease-out"
      style={{
        height: `${height}px`,
        opacity: 0.4 + progress * 0.6,
        transform: `translateY(${(1 - progress) * 8}px)`,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full touch-none"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        role="img"
        aria-label="Grafik keuangan"
      >
        <defs>
          {series
            .filter((s) => s.fillGradient)
            .map((s) => (
              <linearGradient
                key={s.id}
                id={`grad-${uid}-${s.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
        </defs>

        {ticks.map((t, tickIdx) => {
          const y =
            PAD.top +
            (H - PAD.top - PAD.bottom) -
            (t / maxVal) * (H - PAD.top - PAD.bottom);
          const tickProgress = Math.min(1, progress * 1.4 - tickIdx * 0.08);
          return (
            <g
              key={`tick-${tickIdx}-${t}`}
              style={{ opacity: tickProgress }}
            >
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="#e4e4e7"
                strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-400 text-[11px]"
              >
                {t >= 1_000_000
                  ? `${(t / 1_000_000).toFixed(1)}jt`
                  : t >= 1_000
                    ? `${Math.round(t / 1_000)}rb`
                    : t}
              </text>
            </g>
          );
        })}

        {hoverX != null && progress > 0.5 && (
          <line
            x1={hoverX}
            y1={PAD.top}
            x2={hoverX}
            y2={baseY}
            stroke="#a1a1aa"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {series.map((s, seriesIdx) => {
          const pts = pointCoords(s.values, maxVal, W, H, PAD);
          const path = linePath(pts);
          const area =
            s.fillGradient && pts.length > 0 ? areaPath(pts, baseY) : "";
          const seriesProgress = Math.min(
            1,
            Math.max(0, progress * 1.1 - seriesIdx * 0.12),
          );

          return (
            <g key={s.id} style={{ opacity: seriesProgress }}>
              {area && (
                <path
                  d={area}
                  fill={`url(#grad-${uid}-${s.id})`}
                  style={{
                    opacity: seriesProgress,
                    transform: `scaleY(${0.85 + seriesProgress * 0.15})`,
                    transformOrigin: `${W / 2}px ${baseY}px`,
                  }}
                />
              )}
              <AnimatedLine
                d={path}
                color={s.color}
                progress={seriesProgress}
              />
              {pts.map((p, i) => {
                const ptProgress = Math.min(
                  1,
                  Math.max(0, seriesProgress * pts.length - i * 0.35),
                );
                return (
                  <circle
                    key={`${s.id}-pt-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={(hoverIdx === i ? 7 : 4.5) * ptProgress}
                    fill="white"
                    stroke={s.color}
                    strokeWidth={hoverIdx === i ? 3 : 2.5}
                    style={{
                      opacity: ptProgress,
                      transition: "r 0.15s ease, opacity 0.2s ease",
                    }}
                  />
                );
              })}
            </g>
          );
        })}

        {labels.map((label, i) => {
          const pts = pointCoords(series[0]?.values ?? [], maxVal, W, H, PAD);
          const x = pts[i]?.x ?? PAD.left;
          const labelProgress = Math.min(
            1,
            Math.max(0, progress * labels.length - i * 0.25),
          );
          return (
            <text
              key={`${label}-${i}`}
              x={x}
              y={H - 10}
              textAnchor="middle"
              className={`fill-zinc-500 text-[11px] capitalize ${
                hoverIdx === i ? "font-semibold fill-zinc-800" : ""
              }`}
              style={{ opacity: labelProgress }}
            >
              {label}
            </text>
          );
        })}
      </svg>

      {hoverIdx != null && labels[hoverIdx] && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[160px] rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm transition-opacity duration-200"
          style={{
            left: `${Math.min(Math.max(((hoverIdx / Math.max(labels.length - 1, 1)) * 100), 8), 72)}%`,
            transform: "translateX(-50%)",
          }}
        >
          <p className="mb-1.5 text-xs font-semibold text-zinc-700">
            {labels[hoverIdx]}
          </p>
          <ul className="space-y-1">
            {series.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 text-xs"
              >
                <span className="flex items-center gap-1.5 text-zinc-600">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.name}
                </span>
                <span className="font-semibold tabular-nums text-zinc-900">
                  {formatRupiah(s.values[hoverIdx] ?? 0, true)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
