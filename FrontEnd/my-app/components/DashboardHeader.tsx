import { Bell, HelpCircle, Menu, Search } from "lucide-react";

type DashboardHeaderProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
};

export default function DashboardHeader({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search",
  onMenuToggle,
  isSidebarOpen = true,
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

      <div className="relative min-w-0 flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 sm:left-4" />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pr-3 pl-9 text-sm text-zinc-700 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100 sm:py-2.5 sm:pr-4 sm:pl-11"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 sm:flex"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div
          className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 sm:h-10 sm:w-10"
          aria-hidden
        />
      </div>
    </header>
  );
}
