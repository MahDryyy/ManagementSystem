"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardPasien from "@/app/DashboardPasien";
import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import { DEFAULT_ROUTE, type AppRoute } from "@/lib/routes";

const LG_BREAKPOINT = 1024;

const routeTitles: Record<AppRoute, string> = {
  dashboard: "Dashboard",
  "dashboard-pasien": "Dashboard Pasien",
  "dashboard-obat": "Dashboard Obat",
  "dashboard-website": "Dashboard Website",
  "dashboard-laporan": "Dashboard Laporan",
  "dashboard-keuangan": "Dashboard Keuangan",
  settings: "Settings",
  help: "Help",
};

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <h2 className="text-xl font-semibold text-zinc-800 sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">Halaman ini belum tersedia.</p>
    </div>
  );
}

function isLargeViewport() {
  return window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`).matches;
}

export default function AppShell() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(DEFAULT_ROUTE);
  const [headerSearch, setHeaderSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const closeSidebar = useCallback(() => {
    setMobileOpen(false);
    setDesktopCollapsed(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isLargeViewport()) {
      setDesktopCollapsed((c) => !c);
    } else {
      setMobileOpen((o) => !o);
    }
  }, []);

  const handleNavigate = useCallback((route: AppRoute) => {
    setActiveRoute(route);
    setMobileOpen(false);
  }, []);

  const isSidebarOpen = mounted
    ? isLargeViewport()
      ? !desktopCollapsed
      : mobileOpen
    : false;

  const showPasienDashboard = activeRoute === "dashboard-pasien";

  return (
    <div className="relative flex h-full overflow-hidden bg-zinc-50">
      <div
        role="presentation"
        className={`fixed inset-0 z-30 bg-zinc-900/40 transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeSidebar}
      />

      <Sidebar
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        desktopCollapsed={desktopCollapsed}
        onClose={closeSidebar}
        onLogout={() => {
          console.log("logout");
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          onMenuToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />

        {showPasienDashboard ? (
          <DashboardPasien />
        ) : (
          <PlaceholderPage title={routeTitles[activeRoute]} />
        )}
      </div>
    </div>
  );
}
