import { Bell, HelpCircle, Menu } from "lucide-react";
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
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-zinc-100 bg-white px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
      <button
        type="button"
        onClick={onMenuToggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50"
        aria-label={isSidebarOpen ? "Sembunyikan menu" : "Buka menu"}
        aria-expanded={isSidebarOpen}
        aria-controls="app-sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex flex-1 items-center" />

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 sm:flex"
          aria-label="Help"
          onClick={() => onNavigate("help")}
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div
          className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 sm:h-10 sm:w-10"
          aria-hidden
        />
      </div>
    </header>
  );
}