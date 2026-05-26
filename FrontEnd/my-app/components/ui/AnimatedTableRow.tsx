"use client";

import { useEffect, useState, type ReactNode } from "react";

type AnimatedTableRowProps = {
  children: ReactNode;
  delayMs?: number;
};

export function AnimatedTableRow({
  children,
  delayMs = 0,
}: AnimatedTableRowProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), 16 + delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);

  return (
    <tr
      className="border-b border-zinc-50 text-zinc-700 last:border-0"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
      }}
    >
      {children}
    </tr>
  );
}
