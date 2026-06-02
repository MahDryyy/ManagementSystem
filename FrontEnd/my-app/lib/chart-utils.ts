/** Skala nilai chart ke koordinat Y (0 = atas, max = bawah dalam area plot). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const n = value / base;
  if (n <= 1) return base;
  if (n <= 2) return 2 * base;
  if (n <= 5) return 5 * base;
  return 10 * base;
}

export function yTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = Array.from({ length: count + 1 }, (_, i) =>
    Math.round((max / count) * i),
  );
  const unique: number[] = [];
  for (const v of raw) {
    if (unique.length === 0 || v !== unique[unique.length - 1]) {
      unique.push(v);
    }
  }
  return unique;
}

/** Indeks label sumbu-X yang ditampilkan agar tidak menumpuk saat data banyak. */
export function visibleLabelIndices(total: number, maxVisible = 10): Set<number> {
  if (total <= 0) return new Set();
  if (total <= maxVisible) {
    return new Set(Array.from({ length: total }, (_, i) => i));
  }
  const indices = new Set<number>();
  indices.add(0);
  const step = (total - 1) / (maxVisible - 1);
  for (let i = 1; i < maxVisible - 1; i++) {
    indices.add(Math.round(i * step));
  }
  indices.add(total - 1);
  return indices;
}

export function pointCoords(
  values: number[],
  max: number,
  width: number,
  height: number,
  pad: { top: number; right: number; bottom: number; left: number },
) {
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;

  return values.map((v, i) => ({
    x: pad.left + i * step,
    y: pad.top + innerH - (v / max) * innerH,
    value: v,
  }));
}

export function linePath(
  pts: { x: number; y: number }[],
): string {
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export function areaPath(
  pts: { x: number; y: number }[],
  baseY: number,
): string {
  if (pts.length === 0) return "";
  const line = linePath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${line} L${last.x.toFixed(2)},${baseY} L${first.x.toFixed(2)},${baseY} Z`;
}

export function nearestIndex(
  clientX: number,
  rect: DOMRect,
  count: number,
  padLeft: number,
  padRight: number,
): number {
  if (count <= 1) return 0;
  const innerW = rect.width - padLeft - padRight;
  const x = clientX - rect.left - padLeft;
  const ratio = Math.max(0, Math.min(1, x / innerW));
  return Math.round(ratio * (count - 1));
}
