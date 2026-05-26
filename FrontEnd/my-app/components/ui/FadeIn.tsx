"use client";

import { useEffect, useState, type ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  durationMs?: number;
};

export default function FadeIn({
  children,
  className = "",
  delayMs = 0,
  durationMs = 500,
}: FadeInProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), 16);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      className={`ease-out ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transitionProperty: "opacity, transform",
        transitionDuration: `${durationMs}ms`,
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
