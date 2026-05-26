"use client";

import { useState } from "react";
import DashboardPasien from "@/app/DashboardPasien";
import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import { DEFAULT_ROUTE, type AppRoute } from "@/lib/routes";

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
    <div className="min-h-0 flex-1 overflow-y-auto p-8">
      <h2 className="text-2xl font-semibold text-zinc-800">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">Halaman ini belum tersedia.</p>
    </div>
  );
}

export default function AppShell() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(DEFAULT_ROUTE);
  const [headerSearch, setHeaderSearch] = useState("");

  const showPasienDashboard = activeRoute === "dashboard-pasien";

  return (
    <div className="flex h-full overflow-hidden bg-zinc-50">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        onLogout={() => {
          console.log("logout");
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
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
