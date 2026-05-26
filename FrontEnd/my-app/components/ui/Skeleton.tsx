import type { ReactNode } from "react";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-zinc-200 animate-pulse ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 w-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

export function SkeletonCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm">
      {children}
    </div>
  );
}
