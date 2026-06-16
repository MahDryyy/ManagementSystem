"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardKeuangan from "@/app/DashboardKeuangan";
import DashboardPasien from "@/app/DashboardPasien";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardLaporan from "@/components/dashboard-laporan/DashboardLaporan";
import LoginPage from "@/components/LoginPage";
import SettingsPage from "@/components/settings/SettingsPage";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user, loading, logout, canAccess, firstAllowedRoute } = useAuth();
  const [activeRoute, setActiveRoute] = useState<AppRoute>(DEFAULT_ROUTE);
  const [headerSearch, setHeaderSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const allowedRoutes: AppRoute[] = user
    ? (
        [
          "dashboard",
          "dashboard-pasien",
          "dashboard-obat",
          "dashboard-website",
          "dashboard-laporan",
          "dashboard-keuangan",
          "settings",
        ] as AppRoute[]
      ).filter((r) => canAccess(r))
    : [];

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!canAccess(activeRoute) && activeRoute !== "help") {
      setActiveRoute(firstAllowedRoute());
    }
  }, [user, activeRoute, canAccess, firstAllowedRoute]);

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

  const handleNavigate = useCallback(
    (route: AppRoute) => {
      if (route !== "help" && !canAccess(route)) return;
      setActiveRoute(route);
      setMobileOpen(false);
    },
    [canAccess],
  );

  const handleLogout = useCallback(() => {
    logout();
    setActiveRoute(DEFAULT_ROUTE);
  }, [logout]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 text-sm text-zinc-400">
        Memuat…
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isSidebarOpen = mounted
    ? isLargeViewport()
      ? !desktopCollapsed
      : mobileOpen
    : false;

  const renderMain = () => {
    if (activeRoute === "dashboard-pasien") return <DashboardPasien />;
    if (activeRoute === "dashboard-keuangan") return <DashboardKeuangan />;
    if (activeRoute === "dashboard-laporan") return <DashboardLaporan />;
    if (activeRoute === "settings") return <SettingsPage />;
    return <PlaceholderPage title={routeTitles[activeRoute]} />;
  };

  return (
    <div className="relative flex h-full overflow-hidden bg-zinc-50">
      <div
        role="presentation"
        className={`fixed inset-0 z-30 bg-zinc-900/40 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeSidebar}
      />

      <Sidebar
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        desktopCollapsed={desktopCollapsed}
        onClose={closeSidebar}
        allowedRoutes={allowedRoutes}
        onLogout={handleLogout}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          onMenuToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          onNavigate={handleNavigate}
        />
        {renderMain()}
      </div>
    </div>
  );
}
