"use client";

import { useState } from "react";
import { Menu, Stethoscope } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRoute } from "@/lib/routes";

type DashboardHeaderProps = {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
  onNavigate: (route: AppRoute) => void;
};

export default function DashboardHeader({
  onMenuToggle,
  isSidebarOpen = true,
  onNavigate,
}: DashboardHeaderProps) {
  const { user } = useAuth();

  const initials = (user?.username ?? "Guest")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-zinc-100 bg-white/80 px-4 py-3 backdrop-blur-md sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
      <button
        type="button"
        onClick={onMenuToggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-600 active:scale-95"
        aria-label={isSidebarOpen ? "Sembunyikan menu" : "Buka menu"}
        aria-expanded={isSidebarOpen}
        aria-controls="app-sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden items-center gap-2.5 sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 text-white shadow-sm shadow-cyan-200">
          <Stethoscope className="h-4.5 w-4.5" strokeWidth={2.25} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-zinc-900">
            Ampelgading
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Medical Center
          </p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 sm:gap-3">

        <div className="h-6 w-px bg-zinc-200" />

        <button
          type="button"
          className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-zinc-50 sm:pr-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs font-semibold text-white">
            {initials || "G"}
          </span>
          <span className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight text-zinc-900">
              {user?.username ?? "Guest"}
            </p>
            <p className="text-xs leading-tight text-cyan-500">Online</p>
          </span>
        </button>
      </div>
    </header>
  );
}