"use client";

import { useEffect, useState } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Animasi 0→1; reset otomatis saat `activeKey` berubah. */
export function useAnimateProgress(
  activeKey: string | number,
  enabled: boolean,
  durationMs = 900,
) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setProgress(0);
      return;
    }

    setProgress(0);
    let start: number | null = null;
    let frame = 0;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / durationMs, 1);
      setProgress(easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeKey, enabled, durationMs]);

  return progress;
}

export function animateNumber(value: number, progress: number) {
  return Math.round(value * progress);
}
